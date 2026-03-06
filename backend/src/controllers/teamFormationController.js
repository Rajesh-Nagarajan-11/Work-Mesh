/**
 * controllers/teamFormationController.js
 *
 * Proxies to the Python ML FastAPI service for team recommendations.
 * Enriches the request with org context from JWT, then forwards to
 * GET /team/recommend/{project_id}?organization_id=...
 */

const http = require('http');
const { ok, fail } = require('../utils/apiResponse');

const ML_HOST = process.env.ML_SERVICE_HOST || 'localhost';
const ML_PORT = parseInt(process.env.ML_SERVICE_PORT || '8000', 10);

/**
 * Simple wrapper to make an HTTP GET and return parsed JSON.
 */
function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    reject(new Error('Invalid JSON from ML service'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * GET /api/projects/:id/recommend-team
 * Query params:
 *   exclude_unavailable  (optional, default false)
 */
async function recommendTeam(req, res) {
    const projectId = req.params.id;
    const orgId = req.user?.organizationId;          // set by authenticate middleware
    const excludeUnavailable = req.query.exclude_unavailable === 'true';

    if (!orgId) {
        return fail(res, 401, 'Organization context missing from token');
    }

    const mlUrl = `http://${ML_HOST}:${ML_PORT}/team/recommend/${projectId}?organization_id=${orgId}&exclude_unavailable=${excludeUnavailable}`;

    try {
        const { status, body } = await httpGet(mlUrl);

        if (status === 404) {
            return fail(res, 404, body.detail || 'Project not found in ML service');
        }
        if (status !== 200) {
            return fail(res, 502, `ML service error (${status})`);
        }

        return ok(res, body, 'Team recommendation ready');
    } catch (err) {
        console.error('[teamFormationController] ML service unreachable:', err.message);
        return fail(
            res,
            503,
            'ML service is not available. Make sure the Python FastAPI server is running on port 8000.'
        );
    }
}

module.exports = { recommendTeam };
