require('dotenv').config();

const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const cron = require('node-cron');

const app = express();


// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(express.json());


// ========================================
// Server Configuration
// ========================================

const PORT = process.env.PORT || 5000;

const VAPID_PUBLIC_KEY =
    process.env.VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY;

const VAPID_EMAIL =
    process.env.VAPID_EMAIL;


// ========================================
// Check VAPID Configuration
// ========================================

if (
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY ||
    !VAPID_EMAIL
) {
    console.error('');
    console.error('❌ VAPID configuration is missing!');
    console.error('Please check backend/.env');
    console.error('');
    process.exit(1);
}


// ========================================
// Web Push Configuration
// ========================================

webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);


// ========================================
// Reminder Storage
// ========================================

const reminders = [];


// ========================================
// Home Route
// ========================================

app.get('/', (req, res) => {

    res.status(200).json({
        success: true,
        message: '🚀 TaskFlow backend is running!',
        status: 'online'
    });

});


// ========================================
// Health Check
// ========================================

app.get('/health', (req, res) => {

    res.status(200).json({
        success: true,
        server: 'online',
        reminders: reminders.length,
        time: new Date().toISOString()
    });

});


// ========================================
// Get VAPID Public Key
// ========================================

app.get('/vapid-public-key', (req, res) => {

    res.status(200).json({
        publicKey: VAPID_PUBLIC_KEY
    });

});


// ========================================
// Schedule Reminder
// ========================================

app.post('/subscribe', (req, res) => {

    try {

        const {
            subscription,
            task,
            reminderTime
        } = req.body;


        // Validate request

        if (
            !subscription ||
            !task ||
            !reminderTime
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Subscription, task and reminder time are required.'
            });

        }


        // Validate subscription

        if (
            !subscription.endpoint
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid push subscription.'
            });

        }


        // Convert reminder time

        const reminderDate =
            new Date(reminderTime);


        // Validate date

        if (
            Number.isNaN(
                reminderDate.getTime()
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid reminder time.'
            });

        }


        // Check future time

        if (
            reminderDate <= new Date()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Reminder time must be in the future.'
            });

        }


        // Create reminder

        const reminder = {

            id: Date.now(),

            task: task.trim(),

            reminderTime: reminderDate,

            subscription: subscription,

            sent: false

        };


        // Save reminder

        reminders.push(reminder);


        console.log('');
        console.log('⏰ Reminder scheduled');
        console.log(`Task: ${reminder.task}`);
        console.log(
            `Time: ${reminder.reminderTime.toLocaleString()}`
        );
        console.log('');


        res.status(201).json({

            success: true,

            message:
                'Reminder scheduled successfully.',

            reminderId:
                reminder.id

        });

    } catch (error) {

        console.error(
            '❌ Error scheduling reminder:',
            error
        );

        res.status(500).json({

            success: false,

            message:
                'Internal server error.'

        });

    }

});


// ========================================
// View Scheduled Reminders
// ========================================

app.get('/reminders', (req, res) => {

    const result =
        reminders.map(reminder => ({

            id:
                reminder.id,

            task:
                reminder.task,

            reminderTime:
                reminder.reminderTime,

            sent:
                reminder.sent

        }));


    res.json({

        success: true,

        count:
            result.length,

        reminders:
            result

    });

});


// ========================================
// Send Push Notification
// ========================================

async function sendPushNotification(
    reminder
) {

    const payload = JSON.stringify({

        title:
            '🔔 TaskFlow Reminder',

        body:
            `You left your work: "${reminder.task}"`,

        icon:
            'https://roshankumarmishra.github.io/todo-list-js/icon.png',

        badge:
            'https://roshankumarmishra.github.io/todo-list-js/icon.png',

        data: {

            url:
                'https://roshankumarmishra.github.io/todo-list-js/'

        }

    });


    try {

        await webpush.sendNotification(

            reminder.subscription,

            payload

        );


        reminder.sent = true;


        console.log('');
        console.log('🔔 NOTIFICATION SENT');
        console.log(`Task: ${reminder.task}`);
        console.log('');


    } catch (error) {

        console.error('');
        console.error(
            '❌ Notification failed:',
            error.message
        );


        // Remove invalid subscriptions

        if (
            error.statusCode === 404 ||
            error.statusCode === 410
        ) {

            reminder.sent = true;

            console.log(
                '⚠️ Push subscription is no longer valid.'
            );

        }

        console.error('');

    }

}


// ========================================
// Check Reminders
// ========================================

async function checkReminders() {

    const now =
        new Date();


    for (
        const reminder of reminders
    ) {

        // Ignore already sent reminders

        if (reminder.sent) {
            continue;
        }


        // Check reminder time

        if (
            now >= reminder.reminderTime
        ) {

            await sendPushNotification(
                reminder
            );

        }

    }

}


// ========================================
// Reminder Scheduler
// ========================================
//
// Checks every minute.
//

cron.schedule(
    '* * * * *',
    async () => {

        await checkReminders();

    }
);


// ========================================
// Start Server
// ========================================

app.listen(
    PORT,
    () => {

        console.log('');

        console.log(
            '========================================'
        );

        console.log(
            '🚀 TaskFlow Backend Started'
        );

        console.log(
            `📡 http://localhost:${PORT}`
        );

        console.log(
            '⏰ Reminder scheduler is active'
        );

        console.log(
            '========================================'
        );

        console.log('');

    }
);