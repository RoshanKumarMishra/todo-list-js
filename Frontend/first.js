const API_URL = 'http://localhost:5000';

const form = document.querySelector('#taskForm');
const input = document.querySelector('#task');
const reminderInput = document.querySelector('#reminder');
const allTask = document.querySelector('#allTask');

const taskStatus = document.querySelector('#taskStatus');
const taskCount = document.querySelector('#taskCount');

const clearCompleted =
    document.querySelector('#clearCompleted');

const enableNotifications =
    document.querySelector('#enableNotifications');

const alarmOverlay =
    document.querySelector('#alarmOverlay');

const alarmSound =
    document.querySelector('#alarmSound');

const alarmTaskText =
    document.querySelector('#alarmTaskText');

const stopAlarm =
    document.querySelector('#stopAlarm');

const STORAGE_KEY = 'taskFlowTasks';

let tasks =
    JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];


/* ================================
   SAVE TASKS
================================ */

function saveTasks() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tasks)
    );
}


/* ================================
   RENDER TASKS
================================ */

function renderTasks() {

    allTask.innerHTML = '';

    if (tasks.length === 0) {

        allTask.innerHTML =
            '<div class="empty-state">' +
            '<div class="empty-state-icon">📋</div>' +
            '<p>No tasks added yet.</p>' +
            '</div>';

    } else {

        tasks.forEach(function(task) {

            const parent =
                document.createElement('div');

            parent.className = 'task-item';


            const content =
                document.createElement('div');

            content.className = 'task-content';


            const taskText =
                document.createElement('span');

            taskText.className = 'task-text';

            taskText.textContent =
                task.text;


            const taskTime =
                document.createElement('small');

            taskTime.className =
                'task-time';

            taskTime.textContent =
                'Added ' +
                formatDate(task.createdAt);


            content.appendChild(taskText);
            content.appendChild(taskTime);


            if (task.reminderTime) {

                const reminder =
                    document.createElement('small');

                reminder.className =
                    'reminder-time';

                reminder.textContent =
                    '⏰ Reminder: ' +
                    formatDate(task.reminderTime);

                content.appendChild(reminder);
            }


            const doneButton =
                document.createElement('button');

            doneButton.type = 'button';

            doneButton.className =
                'done-btn';

            doneButton.textContent =
                task.completed
                    ? 'Undo'
                    : 'Done';


            const deleteButton =
                document.createElement('button');

            deleteButton.type = 'button';

            deleteButton.className =
                'delete-btn';

            deleteButton.textContent =
                'Delete';


            if (task.completed) {

                taskText.style.textDecoration =
                    'line-through';

                taskText.style.color =
                    '#64748b';
            }


            parent.appendChild(content);

            parent.appendChild(doneButton);

            parent.appendChild(deleteButton);

            allTask.appendChild(parent);


            doneButton.addEventListener(
                'click',
                function() {

                    task.completed =
                        !task.completed;

                    saveTasks();

                    renderTasks();
                }
            );


            deleteButton.addEventListener(
                'click',
                function() {

                    tasks =
                        tasks.filter(
                            function(item) {
                                return item.id !== task.id;
                            }
                        );

                    saveTasks();

                    renderTasks();
                }
            );

        });

    }

    updateStatus();

    updateTaskCount();
}


/* ================================
   ADD TASK
================================ */

form.addEventListener(
    'submit',
    async function(event) {

        event.preventDefault();


        const text =
            input.value.trim();

        const reminderTime =
            reminderInput.value;


        if (!text) {
            return;
        }


        if (reminderTime) {

            const reminderDate =
                new Date(reminderTime);


            if (
                Number.isNaN(
                    reminderDate.getTime()
                )
            ) {

                alert(
                    'Please enter a valid reminder time.'
                );

                return;
            }


            if (
                reminderDate <= new Date()
            ) {

                alert(
                    'Please select a future date and time.'
                );

                return;
            }
        }


        const task = {

            id: Date.now(),

            text: text,

            completed: false,

            createdAt:
                new Date().toISOString(),

            reminderTime:
                reminderTime
                    ? new Date(
                        reminderTime
                    ).toISOString()
                    : null,

            reminderTriggered: false
        };


        tasks.push(task);

        saveTasks();

        renderTasks();


        if (task.reminderTime) {

            await scheduleReminder(
                task.text,
                task.reminderTime
            );
        }


        form.reset();

        input.focus();

    }
);


/* ================================
   ENABLE NOTIFICATIONS
================================ */

if (enableNotifications) {

    enableNotifications.addEventListener(
        'click',
        enablePushNotifications
    );

}


async function enablePushNotifications() {

    console.log(
        '🔔 Enable Notifications clicked'
    );


    try {

        if (!('Notification' in window)) {

            alert(
                '❌ Your browser does not support notifications.'
            );

            return;
        }


        if (!('serviceWorker' in navigator)) {

            alert(
                '❌ Service Workers are not supported.'
            );

            return;
        }


        if (!('PushManager' in window)) {

            alert(
                '❌ Push notifications are not supported.'
            );

            return;
        }


        const permission =
            await Notification.requestPermission();


        console.log(
            'Notification permission:',
            permission
        );


        if (permission !== 'granted') {

            alert(
                '❌ Notification permission was not granted.'
            );

            return;
        }


        const registration =
            await navigator.serviceWorker.register(
                './sw.js'
            );


        console.log(
            '✅ Service Worker registered:',
            registration.scope
        );


        await navigator.serviceWorker.ready;


        console.log(
            '✅ Service Worker is ready.'
        );


        const response =
            await fetch(
                API_URL +
                '/vapid-public-key'
            );


        if (!response.ok) {

            throw new Error(
                'Backend server is not running.'
            );
        }


        const data =
            await response.json();


        console.log(
            '✅ VAPID public key received.'
        );


        if (!data.publicKey) {

            throw new Error(
                'VAPID public key is missing.'
            );
        }


        let subscription =
            await registration.pushManager
                .getSubscription();


        if (!subscription) {

            subscription =
                await registration.pushManager
                    .subscribe({

                        userVisibleOnly: true,

                        applicationServerKey:
                            urlBase64ToUint8Array(
                                data.publicKey
                            )

                    });
        }


        localStorage.setItem(
            'pushSubscription',
            JSON.stringify(subscription)
        );


        if (enableNotifications) {

            enableNotifications.textContent =
                '✅ Notifications Enabled';

            enableNotifications.classList.add(
                'enabled'
            );
        }


        prepareAlarmAudio();


        alert(
            '✅ Notifications enabled successfully!'
        );


    } catch (error) {

        console.error(
            '❌ Notification error:',
            error
        );


        alert(
            '❌ Could not enable notifications.\n\n' +
            error.message
        );
    }
}


/* ================================
   PREPARE ALARM
================================ */

function prepareAlarmAudio() {

    if (!alarmSound) {

        console.warn(
            '⚠️ alarmSound element not found.'
        );

        return;
    }


    alarmSound.load();


    console.log(
        '🔊 Alarm audio prepared.'
    );
}


/* ================================
   SCHEDULE REMINDER
================================ */

async function scheduleReminder(
    task,
    reminderTime
) {

    const savedSubscription =
        localStorage.getItem(
            'pushSubscription'
        );


    if (!savedSubscription) {

        alert(
            '🔔 Please enable notifications first, then add a reminder.'
        );

        return;
    }


    try {

        const response =
            await fetch(
                API_URL +
                '/subscribe',
                {

                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify({

                            subscription:
                                JSON.parse(
                                    savedSubscription
                                ),

                            task:
                                task,

                            reminderTime:
                                reminderTime

                        })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                'Could not schedule reminder.'
            );
        }


        console.log(
            '✅ Reminder scheduled:',
            result
        );


    } catch (error) {

        console.error(
            '❌ Reminder scheduling error:',
            error
        );


        alert(
            '❌ Could not schedule the reminder.\n\n' +
            error.message
        );
    }
}


/* ================================
   LOCAL ALARM
================================ */

function checkLocalAlarms() {

    const now =
        Date.now();


    tasks.forEach(function(task) {

        if (
            task.completed ||
            !task.reminderTime ||
            task.reminderTriggered
        ) {

            return;
        }


        const reminderTime =
            new Date(
                task.reminderTime
            ).getTime();


        if (
            now >= reminderTime
        ) {

            triggerAlarm(task);
        }

    });
}


async function triggerAlarm(task) {

    if (task.reminderTriggered) {
        return;
    }


    task.reminderTriggered =
        true;


    saveTasks();


    if (alarmTaskText) {

        alarmTaskText.textContent =
            'You left your work: "' +
            task.text +
            '"';
    }


    if (alarmOverlay) {

        alarmOverlay.classList.add(
            'active'
        );
    }


    if (alarmSound) {

        try {

            alarmSound.currentTime = 0;

            await alarmSound.play();

            console.log(
                '🔊 ALARM STARTED'
            );

        } catch (error) {

            console.error(
                '❌ Alarm could not play:',
                error
            );

            alert(
                '🚨 Task Reminder: ' +
                task.text
            );
        }
    }
}


/* ================================
   STOP ALARM
================================ */

if (stopAlarm) {

    stopAlarm.addEventListener(
        'click',
        stopCurrentAlarm
    );
}


function stopCurrentAlarm() {

    if (alarmSound) {

        alarmSound.pause();

        alarmSound.currentTime = 0;
    }


    if (alarmOverlay) {

        alarmOverlay.classList.remove(
            'active'
        );
    }


    console.log(
        '⏹ Alarm stopped.'
    );
}


/* ================================
   CLEAR COMPLETED
================================ */

if (clearCompleted) {

    clearCompleted.addEventListener(
        'click',
        function() {

            const completedTasks =
                tasks.filter(
                    function(task) {
                        return task.completed;
                    }
                );


            if (
                completedTasks.length === 0
            ) {

                alert(
                    'There are no completed tasks.'
                );

                return;
            }


            if (
                !confirm(
                    'Clear all completed tasks?'
                )
            ) {

                return;
            }


            tasks =
                tasks.filter(
                    function(task) {
                        return !task.completed;
                    }
                );


            saveTasks();

            renderTasks();

        }
    );
}


/* ================================
   STATUS
================================ */

function updateStatus() {

    const pending =
        tasks.filter(
            function(task) {
                return !task.completed;
            }
        ).length;


    const completed =
        tasks.filter(
            function(task) {
                return task.completed;
            }
        ).length;


    if (tasks.length === 0) {

        taskStatus.textContent =
            '📝 No tasks yet';

        return;
    }


    if (pending === 0) {

        taskStatus.textContent =
            '✅ All tasks completed! (' +
            completed +
            ')';

        return;
    }


    taskStatus.textContent =
        '🔴 ' +
        pending +
        ' task' +
        (pending !== 1 ? 's' : '') +
        ' remaining';
}


/* ================================
   TASK COUNT
================================ */

function updateTaskCount() {

    const completed =
        tasks.filter(
            function(task) {
                return task.completed;
            }
        ).length;


    taskCount.textContent =
        tasks.length +
        ' task' +
        (tasks.length !== 1 ? 's' : '') +
        ' • ' +
        completed +
        ' completed';
}


/* ================================
   DATE FORMAT
================================ */

function formatDate(date) {

    return new Date(date).toLocaleString(
        undefined,
        {
            dateStyle: 'medium',
            timeStyle: 'short'
        }
    );
}


/* ================================
   VAPID KEY CONVERSION
================================ */

function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        '='.repeat(
            (
                4 -
                base64String.length % 4
            ) % 4
        );


    const base64 =
        (
            base64String +
            padding
        )
        .replace(/-/g, '+')
        .replace(/_/g, '/');


    const rawData =
        window.atob(base64);


    return Uint8Array.from(
        [...rawData].map(
            function(character) {

                return character.charCodeAt(0);

            }
        )
    );
}


/* ================================
   CHECK NOTIFICATION STATUS
================================ */

async function checkNotificationStatus() {

    try {

        if (
            !('serviceWorker' in navigator)
        ) {

            return;
        }


        const registration =
            await navigator.serviceWorker
                .getRegistration();


        if (!registration) {

            return;
        }


        const subscription =
            await registration.pushManager
                .getSubscription();


        if (subscription) {

            localStorage.setItem(
                'pushSubscription',
                JSON.stringify(subscription)
            );


            if (enableNotifications) {

                enableNotifications.textContent =
                    '✅ Notifications Enabled';

                enableNotifications.classList.add(
                    'enabled'
                );
            }
        }


    } catch (error) {

        console.error(
            'Notification status error:',
            error
        );
    }
}


/* ================================
   SERVICE WORKER
================================ */

async function registerServiceWorker() {

    try {

        const registration =
            await navigator.serviceWorker.register(
                './sw.js'
            );


        console.log(
            '✅ Service Worker registered:',
            registration.scope
        );


        await navigator.serviceWorker.ready;


        console.log(
            '✅ Service Worker is ready.'
        );


    } catch (error) {

        console.error(
            '❌ Service Worker registration failed:',
            error
        );
    }
}


/* ================================
   START APPLICATION
================================ */

renderTasks();

checkNotificationStatus();

registerServiceWorker();

setInterval(
    checkLocalAlarms,
    1000
);

checkLocalAlarms();