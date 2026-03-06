require('dotenv').config();
const mongoose = require('mongoose');
const Skill = require('./src/models/Skill');
const Organization = require('./src/models/Organization');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/workmesh';

const categories = {
    'Programming Languages': [
        'JavaScript', 'Python', 'Java', 'C++', 'C#', 'TypeScript', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'R', 'Objective-C', 'MATLAB', 'Scala', 'Perl', 'Haskell', 'Lua', 'Dart', 'Julia', 'Assembly', 'Groovy', 'Visual Basic', 'Delphi', 'Cobol', 'Fortran', 'Ada', 'Lisp', 'Prolog', 'Clojure', 'Elixir', 'Erlang', 'F#', 'OCaml', 'Pascal', 'ABAP', 'Apex', 'RPG', 'VHDL', 'Verilog', 'Solidity', 'WebAssembly', 'Bash', 'PowerShell', 'Shell', 'SQL', 'PL/SQL', 'T-SQL', 'ActionScript', 'ColdFusion', 'Crystal', 'Hack', 'Logo', 'PostScript', 'Scratch', 'Smalltalk'
    ],
    'Frontend Development': [
        'React', 'Angular', 'Vue.js', 'Svelte', 'Ember.js', 'Backbone.js', 'Preact', 'Alpine.js', 'LitElement', 'HTML5', 'CSS3', 'Sass', 'LESS', 'Stylus', 'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Chakra UI', 'Ant Design', 'Semantic UI', 'Bulma', 'Foundation', 'Styled Components', 'Emotion', 'Framer Motion', 'Three.js', 'WebGL', 'Canvas API', 'RxJS', 'Redux', 'MobX', 'Vuex', 'Zustand', 'Recoil', 'Jotai', 'React Router', 'Next.js', 'Nuxt.js', 'Gatsby', 'Gridsome', 'Eleventy', 'Astro', 'Webpack', 'Rollup', 'Parcel', 'Vite', 'Babel', 'ESLint', 'Prettier', 'Jest', 'Enzyme', 'React Testing Library', 'Cypress', 'Puppeteer', 'Playwright', 'Storybook', 'jQuery', 'ExtJS'
    ],
    'Backend Development': [
        'Node.js', 'Express.js', 'NestJS', 'Koa', 'Fastify', 'Hapi', 'Sails.js', 'Meteor', 'Spring Boot', 'Spring MVC', 'Hibernate', 'Django', 'Flask', 'FastAPI', 'Pyramid', 'Bottle', 'Tornado', 'Ruby on Rails', 'Sinatra', 'Laravel', 'Symfony', 'CodeIgniter', 'Zend Framework', 'CakePHP', 'Yii', 'ASP.NET Core', 'Entity Framework', 'Go Modules', 'Gin', 'Echo', 'Fiber', 'Beego', 'Actix', 'Rocket', 'Iron', 'Phoenix', 'Play Framework', 'Ktor', 'Micronaut', 'Quarkus', 'Vert.x', 'Dropwizard', 'Struts', 'JSF', 'GraphQL', 'Apollo Server', 'Relay', 'RESTful APIs', 'gRPC', 'Thrift', 'SOAP', 'Socket.IO', 'WebSockets', 'SignalR', 'RabbitMQ', 'Kafka', 'ActiveMQ', 'ZeroMQ', 'NATS', 'Redis', 'Memcached'
    ],
    'Database Management': [
        'MySQL', 'PostgreSQL', 'Oracle DB', 'Microsoft SQL Server', 'SQLite', 'MariaDB', 'IBM DB2', 'Sybase', 'Firebird', 'MongoDB', 'CouchDB', 'Cassandra', 'ScyllaDB', 'HBase', 'Neo4j', 'ArangoDB', 'OrientDB', 'JanusGraph', 'Redis', 'Memcached', 'Hazelcast', 'Riak', 'Aerospike', 'Amazon DynamoDB', 'Amazon Aurora', 'Amazon Redshift', 'Google Cloud Spanner', 'Google BigQuery', 'Firebase Realtime Database', 'Cloud Firestore', 'Azure Cosmos DB', 'Snowflake', 'Teradata', 'Couchbase', 'Elasticsearch', 'Solr', 'Splunk', 'InfluxDB', 'Prometheus', 'TimescaleDB', 'QuestDB', 'Realm', 'Mongoose', 'Sequelize', 'TypeORM', 'Prisma', 'Knex.js', 'SQLAlchemy', 'JPA', 'MyBatis', 'Dapper'
    ],
    'DevOps & Cloud Infrastructure': [
        'Amazon Web Services (AWS)', 'Microsoft Azure', 'Google Cloud Platform (GCP)', 'IBM Cloud', 'Oracle Cloud', 'DigitalOcean', 'Linode', 'Heroku', 'Netlify', 'Vercel', 'Docker', 'Kubernetes', 'Docker Compose', 'Podman', 'LXC', 'Terraform', 'Ansible', 'Puppet', 'Chef', 'Pulumi', 'AWS CloudFormation', 'Azure Resource Manager', 'Jenkins', 'GitLab CI/CD', 'GitHub Actions', 'Travis CI', 'CircleCI', 'Bamboo', 'Bitbucket Pipelines', 'TeamCity', 'Vagrant', 'Packer', 'Prometheus', 'Grafana', 'ELK Stack', 'Datadog', 'New Relic', 'AppDynamics', 'Dynatrace', 'Splunk', 'Nagios', 'Zabbix', 'PagerDuty', 'Opsgenie', 'NGINX', 'Apache HTTP Server', 'HAProxy', 'Traefik', 'Envoy', 'Consul', 'Istio', 'Linkerd'
    ],
    'Data Science & Machine Learning': [
        'Pandas', 'NumPy', 'SciPy', 'Scikit-learn', 'TensorFlow', 'Keras', 'PyTorch', 'XGBoost', 'LightGBM', 'CatBoost', 'NLTK', 'Spacy', 'Gensim', 'Hugging Face Transformers', 'OpenCV', 'YOLO', 'Matplotlib', 'Seaborn', 'Plotly', 'Bokeh', 'D3.js', 'Apache Spark', 'Hadoop', 'Hive', 'Pig', 'Kafka', 'Flink', 'Storm', 'Airflow', 'Luigi', 'Prefect', 'Dagster', 'Jupyter', 'Zeppelin', 'Databricks', 'AWS SageMaker', 'Google AI Platform', 'Azure Machine Learning', 'MLflow', 'Kubeflow', 'Weka', 'RapidMiner', 'KNIME', 'Alteryx', 'Tableau', 'Power BI', 'QlikView', 'Looker', 'Snowflake', 'BigQuery', 'Redshift'
    ],
    'Mobile Development': [
        'iOS', 'Android', 'Swift', 'Objective-C', 'Kotlin', 'Java (Android)', 'React Native', 'Flutter', 'Xamarin', '.NET MAUI', 'Ionic', 'Cordova', 'PhoneGap', 'Onsen UI', 'Framework7', 'NativeScript', 'Appcelerator Titanium', 'Corona SDK', 'Unity (Mobile)', 'Unreal Engine (Mobile)', 'Cocos2d-x', 'RxSwift', 'RxJava', 'Coroutines', 'Alamofire', 'Retrofit', 'Core Data', 'Room', 'Realm (Mobile)', 'SQLite (Mobile)', 'Firebase Crashlytics', 'App Center', 'TestFlight', 'Google Play Console', 'App Store Connect', 'Fastlane', 'Detox', 'Appium', 'Espresso', 'XCUITest'
    ],
    'Cybersecurity & Networking': [
        'Penetration Testing', 'Vulnerability Assessment', 'Ethical Hacking', 'Cryptography', 'Network Security', 'Application Security', 'Cloud Security', 'Endpoint Security', 'Identity and Access Management (IAM)', 'SIEM', 'Intrusion Detection/Prevention (IDS/IPS)', 'Firewall Configuration', 'Malware Analysis', 'Reverse Engineering', 'Forensics', 'Incident Response', 'OWASP Top 10', 'Burp Suite', 'Metasploit', 'Nmap', 'Wireshark', 'Nessus', 'Qualys', 'OpenVAS', 'Kali Linux', 'Snort', 'Suricata', 'Bro/Zeek', 'Splunk (Security)', 'QRadar', 'LogRhythm', 'AlienVault', 'Azure Sentinel', 'AWS Security Hub', 'GCP Security Command Center', 'OAuth 2.0', 'SAML', 'OpenID Connect', 'JWT', 'Active Directory', 'LDAP'
    ],
    'Software Testing & QA': [
        'Manual Testing', 'Automated Testing', 'Unit Testing', 'Integration Testing', 'System Testing', 'Acceptance Testing', 'Performance Testing', 'Load Testing', 'Stress Testing', 'Security Testing', 'Usability Testing', 'Accessibility Testing', 'A/B Testing', 'Test-Driven Development (TDD)', 'Behavior-Driven Development (BDD)', 'Selenium', 'Appium', 'Cypress', 'Playwright', 'Puppeteer', 'TestCafe', 'JUnit', 'TestNG', 'NUnit', 'xUnit', 'pytest', 'unittest', 'RSpec', 'Cucumber', 'JBehave', 'SpecFlow', 'JMeter', 'Gatling', 'Locust', 'Postman', 'SoapUI', 'RestAssured', 'Katalon Studio', 'Tricentis Tosca', 'Micro Focus UFT'
    ],
    'UI/UX Design & Architecture': [
        'User Interface (UI) Design', 'User Experience (UX) Design', 'Visual Design', 'Interaction Design', 'Information Architecture', 'Wireframing', 'Prototyping', 'User Research', 'Usability Testing', 'A/B Testing', 'Persona Development', 'Customer Journey Mapping', 'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Axure RP', 'Balsamiq', 'Marvel', 'Zeplin', 'Abstract', 'Framer', 'Principle', 'Webflow', 'Adobe Creative Cloud', 'Photoshop', 'Illustrator', 'After Effects', 'Design Systems', 'Atomic Design', 'Typography', 'Color Theory', 'Layout Design', 'Material Design', 'Human Interface Guidelines'
    ],
    'Project Management & Methodologies': [
        'Agile', 'Scrum', 'Kanban', 'Lean', 'Extreme Programming (XP)', 'Scaled Agile Framework (SAFe)', 'Waterfall', 'PRINCE2', 'PMBOK', 'Six Sigma', 'Jira', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Notion', 'ClickUp', 'Basecamp', 'Smartsheet', 'Microsoft Project', 'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Subversion (SVN)', 'Mercurial', 'Continuous Integration (CI)', 'Continuous Deployment (CD)', 'DevOps Culture', 'Site Reliability Engineering (SRE)', 'ITIL', 'COBIT', 'Togaf', 'Zachman Framework'
    ],
    'Game Development & Graphics': [
        'Unity 3D', 'Unreal Engine', 'Godot', 'CryEngine', 'Lumberyard', 'GameMaker Studio', 'Construct', 'Phaser', 'Cocos2d', 'DirectX', 'OpenGL', 'Vulkan', 'WebGL', 'Metal', 'HLSL', 'GLSL', 'Cg', 'Blender', 'Maya', '3ds Max', 'ZBrush', 'Substance Painter', 'Photoshop (Gaming)', 'Audacity', 'FMOD', 'Wwise', 'Game Design', 'Level Design', 'Character Rigging', '3D Modeling', '2D Animation', '3D Animation', 'Particle Systems', 'Physics Engines'
    ]
};

async function run() {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB...');

    // Get the first organization or create a dummy one
    let org = await Organization.findOne();
    if (!org) {
        console.log('No organization found. Creating a dummy one...');
        org = await Organization.create({
            companyName: 'Tech Innovators Inc',
            location: 'San Francisco, CA'
        });
    }

    const orgId = org._id;
    let addedCount = 0;
    let duplicateCount = 0;

    console.log(`Loading skills for Organization: ${org.companyName} (${orgId})`);

    for (const [category, skills] of Object.entries(categories)) {
        for (const skillName of skills) {
            try {
                await Skill.create({
                    organizationId: orgId,
                    skill_name: skillName,
                    skill_category: category
                });
                addedCount++;
                if (addedCount % 50 === 0) process.stdout.write('.');
            } catch (err) {
                // If it's a duplicate key error (code 11000), just ignore and count it
                if (err.code === 11000) {
                    duplicateCount++;
                } else {
                    console.error(`\nError adding skill ${skillName}:`, err.message);
                }
            }
        }
    }

    console.log(`\n\nFinished seeding!`);
    console.log(`Successfully added: ${addedCount} new skills.`);
    console.log(`Skipped (already existed): ${duplicateCount} skills.`);
    console.log(`Total skills processed: ${addedCount + duplicateCount}`);

    await mongoose.disconnect();
}

run().catch(console.error);
