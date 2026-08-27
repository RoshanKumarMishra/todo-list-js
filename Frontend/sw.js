// ========================================
// TaskFlow Service Worker
// ========================================


// ========================================
// Install
// ========================================

self.addEventListener(
    'install',
    event => {

        console.log(
            '✅ TaskFlow Service Worker installed.'
        );

        self.skipWaiting();

    }
);


// ========================================
// Activate
// ========================================

self.addEventListener(
    'activate',
    event => {

        console.log(
            '✅ TaskFlow Service Worker activated.'
        );

        event.waitUntil(
            self.clients.claim()
        );

    }
);


// ========================================
// Receive Push Notification
// ========================================

self.addEventListener(
    'push',
    event => {

        let data = {

            title:
                '🔔 TaskFlow Reminder',

            body:
                'You have a pending task.',

            url:
                './'

        };


        // ---------- Read Push Data ----------

        if (event.data) {

            try {

                data =
                    event.data.json();

            } catch (error) {

                console.error(
                    'Could not read push data:',
                    error
                );

            }

        }


        // ---------- Notification Options ----------

        const options = {

            body:
                data.body ||
                'You have a pending task.',

            icon:
                data.icon ||
                './icon.png',

            badge:
                data.badge ||
                './icon.png',

            requireInteraction:
                true,

            vibrate: [
                200,
                100,
                200
            ],

            data: {

                url:
                    data.url ||
                    './'

            }

        };


        // ---------- Show Notification ----------

        event.waitUntil(

            self.registration
                .showNotification(
                    data.title ||
                    '🔔 TaskFlow Reminder',

                    options
                )

        );

    }
);


// ========================================
// Notification Click
// ========================================

self.addEventListener(
    'notificationclick',
    event => {

        console.log(
            '🔔 Notification clicked.'
        );


        event.notification.close();


        const notificationData =
            event.notification.data || {};


        const url =
            notificationData.url ||
            './';


        event.waitUntil(

            clients.matchAll({

                type: 'window',

                includeUncontrolled:
                    true

            })

            .then(
                clientList => {

                    // Try to focus existing TaskFlow tab

                    for (
                        const client
                        of clientList
                    ) {

                        if (
                            'focus' in client
                        ) {

                            return client.focus();

                        }

                    }


                    // Otherwise open TaskFlow

                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            url
                        );

                    }

                }
            )

        );

    }
);


// ========================================
// Notification Close
// ========================================

self.addEventListener(
    'notificationclose',
    event => {

        console.log(
            'Notification closed.'
        );

    }
);