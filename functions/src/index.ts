import {CallableContext} from "firebase-functions/lib/providers/https";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";

const functions = require('firebase-functions');
const admin = require('firebase-admin');


admin.initializeApp();

const COLLECTION_USER = "mobile/user/documents";
const COLLECTION_PROJECT = "mobile/project/documents";

// mobile app function
exports.newProject = functions.https.onCall(async (data: any, context: CallableContext) => {
    const userID = data.userID;
    const label = data.projectLabel;
    const agentID = context.auth?.uid;

    const db = admin.firestore();

    if (agentID !== null) {
        const snapshot: DocumentSnapshot = await db.collection(COLLECTION_USER).doc(agentID).get();
        // tslint:disable-next-line:no-shadowed-variable
        const data: any = snapshot.data();

        if (data.staff) {
            const profile: any = {
                label: label,
                userID: userID,
                agentID: agentID,
                totalCost: 0,
                totalPay: 0,
                created: new Date()
            };

            await db.collection(COLLECTION_PROJECT).add(profile);
        } else {
            throw new functions.https.HttpsError('authorise-access', 'Your do not have admin access to call this function.');
        }

    } else {
        throw new functions.https.HttpsError('authorise-access', 'Only authenticate user can call this function.');
    }
});


// dialog flow function
const {WebhookClient} = require('dialogflow-fulfillment');

exports.dialogflowWebhook = functions.https.onRequest(async (request: any, response: any) => {
    const agent = new WebhookClient({request, response});

    const {queryResult, session} = request.body;
    const sessionID = (session as string).split('/')[4];

    // tslint:disable-next-line:no-shadowed-variable
    async function intentMenu(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentMenu').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentRenoCalculator(agent: any) {
        const db = admin.firestore();

        const query = await db.collection('packages').get();
        const packages: any[] = [];

        for (const snapshot of query.docs) {
            const {kpi, name} = snapshot.data();
            packages.push({label: name, reply: 'I want ' + name + ', RM ' + kpi});
        }

        agent.add('payload:' + JSON.stringify({buttons: packages, text: 'Select your package that your want to calculate'}));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentRenoCalculate(agent: any){
        const {price, size} = queryResult.parameters;

        agent.add('The estimation is RM ' + (price * size));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentHelpdesk(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentHelpdesk').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentAskEnquire(agent: any) {
        const db = admin.firestore();

        const {name, email, about, file} = queryResult.parameters;
        const reply = '';

        await db.collection('enquires').doc(sessionID).set({name, email, about, file, reply}, {merge: true});

        agent.add('Your enquiry has be record! Our staf will reply to your enquiry.');
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentCheckEnquire(agent: any) {
        const db = admin.firestore();

        const snapshot = await db.collection('enquires').doc(sessionID).get();

        if (snapshot.exists) {

            const {reply} = snapshot.data()
            const str = reply as string;

            if (str.length > 0) {
                agent.add(`${reply}`);
            } else {
                agent.add('no reply yet!');
            }
        } else {
            agent.add('not exist');
        }
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentPackages(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentPackages').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentAbout(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentAbout').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentLocation(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentLocation').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentWhatsapp(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentWhatsapp').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    // tslint:disable-next-line:no-shadowed-variable
    async function intentWorkHour(agent: any) {
        const db = admin.firestore();

        const doc = await db.collection('responses').doc('IntentWorkHour').get();
        agent.add('payload:' + JSON.stringify(doc.data()));
    }

    const intentMap = new Map();
    intentMap.set('IntentMenu', intentMenu);
    intentMap.set('IntentPackages', intentPackages);
    intentMap.set('IntentRenoCalculator', intentRenoCalculator);
    intentMap.set('IntentRenoCalculate', intentRenoCalculate);
    intentMap.set('IntentHelpdesk', intentHelpdesk);
    intentMap.set('IntentAskEnquire', intentAskEnquire);
    intentMap.set('IntentCheckEnquire', intentCheckEnquire);
    intentMap.set('IntentAbout', intentAbout);
    intentMap.set('IntentLocation', intentLocation);
    intentMap.set('IntentWhatsapp', intentWhatsapp);
    intentMap.set('IntentWorkHour', intentWorkHour);
    agent.handleRequest(intentMap);
});
