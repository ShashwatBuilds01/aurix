
/* =========================================
   AURIX — PRODUCTIVITY ENGINE
   Tasks · Planner · Reminders · Focus
========================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE = {
    tasks: "aurix_tasks_v1",
    planner: "aurix_planner_v1",
    reminders: "aurix_reminders_v1",
    study: "aurix_study_v1",
    studyPlans: "aurix_study_plans_v1",
    intention: "aurix_intention_v1",
    thoughts: "aurix_thoughts_v1",
    settings: "aurix_settings_v1"
};

function load(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("AURIX could not save data:", error);
    }
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function todayString() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
        .toISOString().slice(0, 10);
}

function showMessage(element, message) {
    if (element) element.textContent = message;
}

/* =========================================
   CLOCK
========================================= */

function updateClock() {
    const now = new Date();

    const dateElement = $("#current-date");
    const timeElement = $("#current-time");

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

updateClock();
setInterval(updateClock, 1000);

/* =========================================
   NAVIGATION
========================================= */

const pageNames = {
    dashboard: "Dashboard",
    tasks: "To-Do List",
    focus: "Focus Center",
    study: "Study Hub",
    planner: "Daily Planner",
    reminders: "Reminders",
    thoughts: "Thoughts & Intention",
    settings: "Settings"
};

function openSection(sectionName) {
    if (!pageNames[sectionName]) return;

    $$(".page-section").forEach((section) => {
        section.classList.toggle("active", section.id === sectionName);
    });

    $$(".nav-link[data-section]").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });

    const title = $("#page-name");
    if (title) title.textContent = pageNames[sectionName];

    $("#sidebar")?.classList.remove("sidebar-open");

    if (sectionName === "study") renderStudy();
    if (sectionName === "planner") renderPlanner();
    if (sectionName === "reminders") renderReminders();
}

$$("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
        openSection(button.dataset.section);
    });
});

$$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
        openSection(button.dataset.go);
    });
});

$("#menu-toggle")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("sidebar-open");
});

/* =========================================
   TO-DO LIST
========================================= */

let tasks = load(STORAGE.tasks, []);

function addTask(text) {
    const cleaned = text.trim();
    if (!cleaned) return;

    tasks.unshift({
        id: makeId(),
        title: cleaned,
        completed: false,
        createdAt: Date.now()
    });

    save(STORAGE.tasks, tasks);
    renderTasks();
}

function toggleTask(id) {
    tasks = tasks.map((task) =>
        task.id === id
            ? { ...task, completed: !task.completed }
            : task
    );

    save(STORAGE.tasks, tasks);
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    save(STORAGE.tasks, tasks);
    renderTasks();
}

function taskMarkup(task) {
    return `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <label class="task-main">
                <input type="checkbox"
                    data-task-toggle="${task.id}"
                    ${task.completed ? "checked" : ""}>
                <span>${escapeHTML(task.title)}</span>
            </label>
            <button type="button" class="text-button"
                data-task-delete="${task.id}"
                aria-label="Delete task">✕</button>
        </div>
    `;
}

function renderTaskList(element, list, emptyElement) {
    if (!element) return;

    element.innerHTML = list.map(taskMarkup).join("");

    if (emptyElement) {
        emptyElement.hidden = list.length > 0;
    }
}

function renderTasks() {
    renderTaskList(
        $("#dashboard-task-list"),
        tasks.slice(0, 5),
        $("#dashboard-empty")
    );

    renderTaskList(
        $("#full-task-list"),
        tasks,
        $("#full-task-empty")
    );

    const completed = tasks.filter((task) => task.completed).length;
    const count = $("#task-count");
    const percent = $("#goal-percent");

    if (count) count.textContent = `${completed} / ${tasks.length}`;

    if (percent) {
        percent.textContent = tasks.length
            ? `${Math.round(completed / tasks.length * 100)}%`
            : "0%";
    }
}

document.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-task-toggle]");
    if (toggle) toggleTask(toggle.dataset.taskToggle);
});

document.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-task-delete]");
    if (remove) deleteTask(remove.dataset.taskDelete);

    const plannerDelete = event.target.closest("[data-planner-delete]");
    if (plannerDelete) {
        plannerItems = plannerItems.filter(
            (item) => item.id !== plannerDelete.dataset.plannerDelete
        );
        save(STORAGE.planner, plannerItems);
        renderPlanner();
    }

    const reminderDelete = event.target.closest("[data-reminder-delete]");
    if (reminderDelete) {
        reminders = reminders.filter(
            (item) => item.id !== reminderDelete.dataset.reminderDelete
        );
        save(STORAGE.reminders, reminders);
        renderReminders();
    }

    const thoughtDelete = event.target.closest("[data-thought-delete]");
    if (thoughtDelete) {
        thoughts = thoughts.filter(
            (item) => item.id !== thoughtDelete.dataset.thoughtDelete
        );
        save(STORAGE.thoughts, thoughts);
        renderThoughts();
    }

    const studyPlanDelete = event.target.closest("[data-study-plan-delete]");
    if (studyPlanDelete) {
        studyPlans = studyPlans.filter(
            (item) => item.id !== studyPlanDelete.dataset.studyPlanDelete
        );
        save(STORAGE.studyPlans, studyPlans);
        renderStudyPlans();
    }
});

$("#task-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask($("#task-input").value);
    $("#task-input").value = "";
});

$("#full-task-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask($("#full-task-input").value);
    $("#full-task-input").value = "";
});

renderTasks();

/* =========================================
   FOCUS COUNTDOWN TIMER
========================================= */

let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerRunning = false;

function formatCountdown(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function renderTimer() {
    const display = formatCountdown(timerRemaining);

    if ($("#timer-display")) $("#timer-display").textContent = display;
    if ($("#large-timer-display")) {
        $("#large-timer-display").textContent = display;
    }

    const status = timerRunning
        ? "Stay focused..."
        : timerRemaining === 0
            ? "Session complete!"
            : "Ready when you are";

    if ($("#timer-status")) $("#timer-status").textContent = status;
    if ($("#large-timer-status")) {
        $("#large-timer-status").textContent = status;
    }
}

function stopCountdown() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = null;
    timerRunning = false;
}

function startCountdown() {
    if (timerRunning) {
        stopCountdown();
        renderTimer();
        return;
    }

    if (timerRemaining <= 0) timerRemaining = timerDuration;

    timerRunning = true;
    renderTimer();

    timerInterval = setInterval(() => {
        timerRemaining--;

        if (timerRemaining <= 0) {
            timerRemaining = 0;
            stopCountdown();
            renderTimer();
            playAlarmTone();
            window.alert("AURIX: Focus session complete!");
            return;
        }

        renderTimer();
    }, 1000);
}

function resetCountdown() {
    stopCountdown();
    timerRemaining = timerDuration;
    renderTimer();
}

$("#timer-start")?.addEventListener("click", startCountdown);
$("#large-timer-start")?.addEventListener("click", startCountdown);
$("#timer-reset")?.addEventListener("click", resetCountdown);
$("#large-timer-reset")?.addEventListener("click", resetCountdown);

function setTimerMinutes(minutes) {
    const value = Number(minutes);

    if (!Number.isFinite(value) || value < 1 || value > 180) {
        window.alert("Choose a timer between 1 and 180 minutes.");
        return;
    }

    stopCountdown();
    timerDuration = Math.round(value) * 60;
    timerRemaining = timerDuration;

    $$(".preset-button").forEach((button) => {
        button.classList.toggle(
            "active",
            Number(button.dataset.minutes) === Math.round(value)
        );
    });

    renderTimer();
}

$("#timer-presets")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-minutes]");
    if (button) setTimerMinutes(button.dataset.minutes);
});

$("#custom-timer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const input = $("#custom-timer-minutes");
    if (!input.value) return;

    setTimerMinutes(input.value);
});

renderTimer();

/* =========================================
   STOPWATCH
========================================= */

let stopwatchRunning = false;
let stopwatchStartedAt = 0;
let stopwatchElapsed = 0;
let stopwatchInterval = null;
let laps = [];

function stopwatchMilliseconds() {
    return stopwatchElapsed +
        (stopwatchRunning ? Date.now() - stopwatchStartedAt : 0);
}

function formatStopwatch(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}

function renderStopwatch() {
    if ($("#stopwatch-display")) {
        $("#stopwatch-display").textContent =
            formatStopwatch(stopwatchMilliseconds());
    }

    const button = $("#stopwatch-start");
    if (button) {
        button.textContent = stopwatchRunning ? "Ⅱ Pause" : "▶ Start";
    }

    const lapContainer = $("#stopwatch-laps");

    if (lapContainer) {
        lapContainer.innerHTML = laps.length
            ? laps.map((lap, index) => `
                <div class="task-item">
                    <span>Lap ${laps.length - index}</span>
                    <strong>${formatStopwatch(lap)}</strong>
                </div>
            `).join("")
            : '<p class="empty-state">Your lap records will appear here.</p>';
    }
}

$("#stopwatch-start")?.addEventListener("click", () => {
    if (stopwatchRunning) {
        stopwatchElapsed += Date.now() - stopwatchStartedAt;
        stopwatchRunning = false;
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    } else {
        stopwatchStartedAt = Date.now();
        stopwatchRunning = true;
        stopwatchInterval = setInterval(renderStopwatch, 200);
    }

    renderStopwatch();
});

$("#stopwatch-lap")?.addEventListener("click", () => {
    if (!stopwatchRunning && stopwatchElapsed === 0) return;

    laps.unshift(stopwatchMilliseconds());
    renderStopwatch();
});

$("#stopwatch-reset")?.addEventListener("click", () => {
    stopwatchRunning = false;
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    stopwatchElapsed = 0;
    laps = [];
    renderStopwatch();
});

$("#stopwatch-clear-laps")?.addEventListener("click", () => {
    laps = [];
    renderStopwatch();
});

renderStopwatch();


/* =========================================
   AUDIO ENGINE — FIXED STOP CONTROL
========================================= */

let audioContext = null;
let alarmAudioInterval = null;
let pendingAudioTimeouts = [];
let activeOscillators = new Set();
let activeAlarmId = null;

function getAudioContext() {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        window.alert("This browser does not support alarm sounds.");
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    return audioContext;
}

function scheduleAlarmNote(
    frequency,
    delay,
    duration,
    volume = 0.12
) {
    const timeout = setTimeout(() => {
        pendingAudioTimeouts =
            pendingAudioTimeouts.filter((id) => id !== timeout);

        const context = getAudioContext();
        if (!context) return;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        activeOscillators.add(oscillator);

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            volume,
            context.currentTime + 0.03
        );
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.onended = () => {
            activeOscillators.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
        };

        oscillator.start();
        oscillator.stop(context.currentTime + duration + 0.04);
    }, delay);

    pendingAudioTimeouts.push(timeout);
}

function playNote(frequency, duration = 0.35, volume = 0.12) {
    scheduleAlarmNote(frequency, 0, duration, volume);
}

function playAlarmTone() {
    const context = getAudioContext();
    if (!context) return;

    const tone = $("#reminder-tone")?.value || "classic";

    if (tone === "gentle") {
        playNote(659, 0.45);
        scheduleAlarmNote(784, 250, 0.5);
        scheduleAlarmNote(988, 550, 0.6);
    } else if (tone === "digital") {
        playNote(880, 0.2);
        scheduleAlarmNote(880, 300, 0.2);
        scheduleAlarmNote(1100, 600, 0.25);
    } else {
        playNote(523, 0.35);
        scheduleAlarmNote(659, 220, 0.4);
        scheduleAlarmNote(784, 470, 0.6);
    }
}

function stopAlarmSound() {
    if (alarmAudioInterval !== null) {
        clearInterval(alarmAudioInterval);
        alarmAudioInterval = null;
    }

    pendingAudioTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
    });
    pendingAudioTimeouts = [];

    activeOscillators.forEach((oscillator) => {
        try {
            oscillator.stop();
            oscillator.disconnect();
        } catch (error) {
            // The oscillator may already have stopped.
        }
    });

    activeOscillators.clear();
}

function startAlarmSound() {
    stopAlarmSound();

    playAlarmTone();

    alarmAudioInterval = setInterval(() => {
        playAlarmTone();
    }, 1800);
}

$("#test-alarm")?.addEventListener("click", () => {
    stopAlarmSound();
    playAlarmTone();
});

$("#test-alarm-stop")?.addEventListener(
    "click",
    stopAlarmSound
);

/* =========================================
   DAILY PLANNER
========================================= */

let plannerItems = load(STORAGE.planner, []);

function renderPlanner() {
    const container = $("#planner-list");
    const empty = $("#planner-empty");

    if (!container) return;

    const sorted = [...plannerItems].sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );

    container.innerHTML = sorted.map((item) => `
        <div class="task-item ${item.completed ? "completed" : ""}">
            <label class="task-main">
                <input type="checkbox" data-planner-toggle="${item.id}"
                    ${item.completed ? "checked" : ""}>
                <span>
                    <strong>${escapeHTML(item.title)}</strong><br>
                    <small>${escapeHTML(item.date)} · ${escapeHTML(item.time)}</small>
                </span>
            </label>
            <button type="button" class="text-button"
                data-planner-delete="${item.id}">✕</button>
        </div>
    `).join("");

    if (empty) empty.hidden = sorted.length > 0;
}

$("#planner-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#planner-title").value.trim();
    const date = $("#planner-date").value;
    const time = $("#planner-time").value;

    if (!title || !date || !time) return;

    plannerItems.push({
        id: makeId(),
        title,
        date,
        time,
        completed: false
    });

    save(STORAGE.planner, plannerItems);
    $("#planner-form").reset();
    $("#planner-date").value = todayString();
    renderPlanner();
});

document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-planner-toggle]");
    if (!checkbox) return;

    plannerItems = plannerItems.map((item) =>
        item.id === checkbox.dataset.plannerToggle
            ? { ...item, completed: checkbox.checked }
            : item
    );

    save(STORAGE.planner, plannerItems);
    renderPlanner();
});

if ($("#planner-date")) $("#planner-date").value = todayString();

renderPlanner();

/* =========================================
   REMINDERS
========================================= */

let reminders = load(STORAGE.reminders, []);
let ringingReminder = null;

function renderReminders() {
    const container = $("#reminder-list");
    const empty = $("#reminder-empty");

    if (!container) return;

    const sorted = [...reminders].sort((a, b) =>
        a.when.localeCompare(b.when)
    );

    container.innerHTML = sorted.map((reminder) => `
        <div class="task-item ${reminder.fired ? "completed" : ""}">
            <div class="task-main">
                <span class="reminder-indicator">🔔</span>
                <span>
                    <strong>${escapeHTML(reminder.title)}</strong><br>
                    <small>${escapeHTML(reminder.when.replace("T", " "))}</small><br>
                    <small>${reminder.fired ? "Alert already triggered" : "Scheduled"}</small>
                </span>
            </div>
            <button type="button" class="text-button"
                data-reminder-delete="${reminder.id}">✕</button>
        </div>
    `).join("");

    if (empty) empty.hidden = sorted.length > 0;

    const dashboard = $("#dashboard-reminders");

    if (dashboard) {
        const upcoming = sorted.filter((item) => !item.fired).slice(0, 3);

        dashboard.innerHTML = upcoming.length
            ? upcoming.map((item) => `
                <div class="task-item">
                    <span>🔔 ${escapeHTML(item.title)}</span>
                    <small>${escapeHTML(item.when.replace("T", " "))}</small>
                </div>
            `).join("")
            : '<p class="empty-state">No upcoming reminders.</p>';
    }
}

$("#reminder-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#reminder-title").value.trim();
    const date = $("#reminder-date").value;
    const time = $("#reminder-time").value
    ;

    if (!title || !date || !time) return;

    const when = `${date}T${time}`;

    if (new Date(when).getTime() <= Date.now()) {
        window.alert("Please select a future date and time.");
        return;
    }

    reminders.push({
        id: makeId(),
        title,
        when,
        fired: false,
        snoozedUntil: null
    });

    save(STORAGE.reminders, reminders);
    $("#reminder-form").reset();
    $("#reminder-date").value = todayString();
    renderReminders();
});

if ($("#reminder-date")) $("#reminder-date").value = todayString();
function triggerReminder(reminder) {
    if (ringingReminder) return;
    function stopAlarmSound() {
    if (alarmAudioInterval) clearInterval(alarmAudioInterval);

    alarmAudioInterval = null;

    if (audioContext?.state === "running") {
        // Keep audio context available for the next user-initiated sound.
    }
}

function startAlarmSound() {
    stopAlarmSound();
    playAlarmTone();

    alarmAudioInterval = setInterval(playAlarmTone, 1800);
}

    ringingReminder = reminder;
    activeAlarmId = reminder.id;

    const overlay = $("#alarm-overlay");
    if (overlay) overlay.hidden = false;

    showMessage($("#alarm-title"), "It's time!");
    showMessage($("#alarm-message"), reminder.title);

    startAlarmSound();

    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("AURIX Reminder", {
                body: reminder.title
            });
        } catch (error) {
            console.warn("Desktop notification unavailable.", error);
        }
    }
}

$("#alarm-stop")?.addEventListener("click", () => {
    stopAlarmSound();

    if (activeAlarmId) {
        reminders = reminders.map((item) =>
            item.id === activeAlarmId
                ? { ...item, fired: true, snoozedUntil: null }
                : item
        );

        save(STORAGE.reminders, reminders);
    }

    $("#alarm-overlay").hidden = true;
    ringingReminder = null;
    activeAlarmId = null;
    renderReminders();
});

$("#alarm-snooze")?.addEventListener("click", () => {
    stopAlarmSound();

    if (activeAlarmId) {
        reminders = reminders.map((item) =>
            item.id === activeAlarmId
                ? {
                    ...item,
                    fired: false,
                    snoozedUntil: Date.now() + 5 * 60 * 1000
                }
                : item
        );

        save(STORAGE.reminders, reminders);
    }

    $("#alarm-overlay").hidden = true;
    ringingReminder = null;
    activeAlarmId = null;
    renderReminders();
});

function checkReminders() {
    if (ringingReminder) return;

    const now = Date.now();

    const due = reminders.find((reminder) => {
        if (reminder.fired) return false;

        if (reminder.snoozedUntil) {
            return Number(reminder.snoozedUntil) <= now;
        }

        return new Date(reminder.when).getTime() <= now;
    });

    if (due) triggerReminder(due);
}

setInterval(checkReminders, 1000);
renderReminders();

/* =========================================
   STUDY HUB
========================================= */

const subjects = {
    Science: [
        "Chemical Reactions and Equations",
        "Acids, Bases and Salts",
        "Metals and Non-metals",
        "Carbon and Its Compounds",
        "Life Processes",
        "Control and Coordination",
        "How Do Organisms Reproduce?",
        "Heredity",
        "Light – Reflection and Refraction",
        "The Human Eye and the Colourful World",
        "Electricity",
        "Magnetic Effects of Electric Current",
        "Our Environment"
    ],
    Mathematics: [
        "Real Numbers",
        "Polynomials",
        "Pair of Linear Equations in Two Variables",
        "Quadratic Equations",
        "Arithmetic Progressions",
        "Triangles",
        "Coordinate Geometry",
        "Introduction to Trigonometry",
        "Some Applications of Trigonometry",
        "Circles",
        "Areas Related to Circles",
        "Surface Areas and Volumes",
        "Statistics",
        "Probability"
    ],
    "Social Science": [
        "The Rise of Nationalism in Europe",
        "Nationalism in India",
        "The Making of a Global World",
        "The Age of Industrialisation",
        "Print Culture and the Modern World",
        "Resources and Development",
        "Forest and Wildlife Resources",
        "Water Resources",
        "Agriculture",
        "Minerals and Energy Resources",
        "Manufacturing Industries",
        "Lifelines of National Economy",
        "Power Sharing",
        "Federalism",
        "Gender, Religion and Caste",
        "Political Parties",
        "Outcomes of Democracy",
        "Development",
        "Sectors of the Indian Economy",
        "Money and Credit",
        "Globalisation and the Indian Economy",
        "Consumer Rights"
    ],
    English: [
        "Reading",
        "Writing Skills",
        "Grammar",
        "First Flight",
        "Footprints Without Feet"
    ],
    Hindi: [
        "Reading",
        "Writing",
        "Grammar",
        "Literature"
    ],
    Computer: [
        "HTML",
        "CSS",
        "Cyber Ethics",
        "E-commerce Fraud",
        "Privacy and Security",
        "Intellectual Property Rights"
    ]
};

let studyProgress = load(STORAGE.study, {});
let studyPlans = load(STORAGE.studyPlans, []);

function renderStudy() {
    const subject = $("#study-subject")?.value || "Science";
    const chapters = subjects[subject] || [];
    const completed = chapters.filter((chapter) =>
        studyProgress[`${subject}:${chapter}`]
    ).length;

    const total = Object.values(subjects)
        .reduce((sum, list) => sum + list.length, 0);

    const overallCompleted = Object.entries(studyProgress)
        .filter(([, value]) => value).length;

    const overallPercent = total
        ? Math.round(overallCompleted / total * 100)
        : 0;

    if ($("#study-total-chapters")) {
        $("#study-total-chapters").textContent = total;
    }

    if ($("#study-completed-chapters")) {
        $("#study-completed-chapters").textContent = overallCompleted;
    }

    if ($("#study-syllabus-percent")) {
        $("#study-syllabus-percent").textContent = `${overallPercent}%`;
    }

    if ($("#dashboard-study-count")) {
        $("#dashboard-study-count").textContent = overallCompleted;
    }

    if ($("#study-subject-progress")) {
        $("#study-subject-progress").style.width =
            `${chapters.length ? completed / chapters.length * 100 : 0}%`;
    }

    showMessage(
        $("#study-subject-progress-label"),
        `${completed} of ${chapters.length} chapters completed`
    );

    const container = $("#study-chapter-list");

    if (container) {
        container.innerHTML = chapters.map((chapter) => {
            const key = `${subject}:${chapter}`;
            const checked = Boolean(studyProgress[key]);

            return `
                <label class="task-item ${checked ? "completed" : ""}">
                    <span>${escapeHTML(chapter)}</span>
                    <input type="checkbox"
                        data-study-chapter="${escapeHTML(key)}"
                        ${checked ? "checked" : ""}>
                </label>
            `;
        }).join("");
    }

    if ($("#study-chapter-empty")) {
        $("#study-chapter-empty").hidden = chapters.length > 0;
    }

    renderStudyPlans();
}

$("#study-subject")?.addEventListener("change", renderStudy);

document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-study-chapter]");
    if (!checkbox) return;

    studyProgress[checkbox.dataset.studyChapter] = checkbox.checked;

    save(STORAGE.study, studyProgress);
    renderStudy();
});

$("#study-plan-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const date = $("#study-plan-date").value;
    const subject = $("#study-plan-subject").value;
    const title = $("#study-plan-task").value.trim();

    if (!date || !subject || !title) return;

    studyPlans.push({
        id: makeId(),
        date,
        subject,
        title
    });

    save(STORAGE.studyPlans, studyPlans);
    $("#study-plan-form").reset();
    $("#study-plan-date").value = todayString();
    renderStudyPlans();
});

function renderStudyPlans() {
    const container = $("#study-plan-list");
    if (!container) return;

    const sorted = [...studyPlans].sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    container.innerHTML = sorted.map((item) => `
        <div class="task-item">
            <span>
                <strong>${escapeHTML(item.title)}</strong><br>
                <small>${escapeHTML(item.subject)} · ${escapeHTML(item.date)}</small>
            </span>
            <button class="text-button" type="button"
                data-study-plan-delete="${item.id}">✕</button>
        </div>
    `).join("");

    if ($("#study-plan-empty")) {
        $("#study-plan-empty").hidden = sorted.length > 0;
    }
}

if ($("#study-plan-date")) $("#study-plan-date").value = todayString();

renderStudy();

/* =========================================
   THOUGHTS & DAILY INTENTION
========================================= */

let thoughts = load(STORAGE.thoughts, []);
let intention = load(STORAGE.intention, "");

function renderThoughts() {
    const container = $("#thought-list");
    if (!container) return;

    container.innerHTML = thoughts.map((thought) => `
        <article class="task-item">
            <div>
                <p>${escapeHTML(thought.text).replace(/\n/g, "<br>")}</p>
                <small>${escapeHTML(thought.date)}</small>
            </div>
            <button class="text-button" type="button"
                data-thought-delete="${thought.id}">✕</button>
        </article>
    `).join("");

    if ($("#thought-empty")) {
        $("#thought-empty").hidden = thoughts.length > 0;
    }
}

if ($("#intention-input")) $("#intention-input").value = intention;

if ($("#dashboard-intention")) {
    $("#dashboard-intention").textContent =
        intention || "Small steps. Consistent progress.";
}

$("#intention-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    intention = $("#intention-input").value.trim();
    save(STORAGE.intention, intention);

    if ($("#dashboard-intention")) {
        $("#dashboard-intention").textContent =
            intention || "Small steps. Consistent progress.";
    }

    showMessage($("#intention-saved"), "Your intention has been saved.");
});

$("#thought-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const input = $("#thought-input");
    const text = input.value.trim();

    if (!text) return;

    thoughts.unshift({
        id: makeId(),
        text,
        date: new Date().toLocaleString("en-IN")
    });

    save(STORAGE.thoughts, thoughts);
    input.value = "";
    renderThoughts();
});

renderThoughts();

/* =========================================
   SETTINGS & EXPORT
========================================= */

let settings = load(STORAGE.settings, {
    name: "",
    timer: 25,
    tone: "classic"
});

if ($("#setting-name")) $("#setting-name").value = settings.name || "";
if ($("#setting-default-timer")) {
    $("#setting-default-timer").value = String(settings.timer || 25);
}
if ($("#setting-tone")) $("#setting-tone").value = settings.tone || "classic";
if ($("#reminder-tone")) $("#reminder-tone").value = settings.tone || "classic";

$("#save-settings")?.addEventListener("click", () => {
    settings = {
        name: $("#setting-name").value.trim(),
        timer: Number($("#setting-default-timer").value) || 25,
        tone: $("#setting-tone").value || "classic"
    };

    save(STORAGE.settings, settings);

    if ($("#reminder-tone")) $("#reminder-tone").value = settings.tone;

    showMessage($("#settings-status"), "Settings saved successfully.");
});

$("#export-data")?.addEventListener("click", () => {
    const data = {};

    Object.entries(STORAGE).forEach(([name, key]) => {
        data[name] = load(key, null);
    });

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "aurix-backup.json";
    link.click();

    URL.revokeObjectURL(url);
});

/* =========================================
   INITIALIZATION
========================================= */

if ($("#reminder-date")) $("#reminder-date").value = todayString();

renderTasks();
renderPlanner();
renderReminders();
renderStudy();
renderStudyPlans();
renderThoughts();
renderTimer();
renderStopwatch();

console.log("AURIX productivity engine initialized.");
