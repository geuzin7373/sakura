const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const ADMIN_EMAIL = 'ageuzinho99@gmail.com';

function requireUser(request) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Entre com sua conta Google.');
    }
    return request.auth;
}

exports.recordAccess = onCall({ region: 'southamerica-east1', cors: true }, async request => {
    const user = requireUser(request);
    const data = request.data || {};

    await db.collection('access_logs').add({
        uid: user.uid,
        email: user.token.email || null,
        displayName: user.token.name || null,
        timestamp: FieldValue.serverTimestamp(),
        timezone: typeof data.timezone === 'string' ? data.timezone.slice(0, 100) : null,
        userAgent: typeof data.userAgent === 'string' ? data.userAgent.slice(0, 500) : null,
        platform: typeof data.platform === 'string' ? data.platform.slice(0, 100) : null,
        language: typeof data.language === 'string' ? data.language.slice(0, 20) : null,
        screenWidth: Number.isFinite(data.screenWidth) ? data.screenWidth : null,
        screenHeight: Number.isFinite(data.screenHeight) ? data.screenHeight : null,
        path: typeof data.path === 'string' ? data.path.slice(0, 300) : '/',
    });

    await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.token.email || null,
        displayName: user.token.name || null,
        lastVisitAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
});

exports.listAccessLogs = onCall({ region: 'southamerica-east1', cors: true }, async request => {
    const user = requireUser(request);
    if (user.token.email !== ADMIN_EMAIL) {
        throw new HttpsError('permission-denied', 'Acesso restrito ao administrador.');
    }

    const snapshot = await db.collection('access_logs')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    return {
        logs: snapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : null;
            return { id: doc.id, ...data, timestamp, createdAt: undefined };
        })
    };
});
