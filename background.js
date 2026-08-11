console.log("OneKey Navigator STARTED");

const COMMAND_DESCRIPTIONS = {
    "next-tab": "Следующая вкладка",
    "previous-tab": "Предыдущая вкладка",
    "close-tab": "Закрыть вкладку",
    "new-tab": "Новая вкладка",
    "go-back": "Назад",
    "go-forward": "Вперёд",
    "new-private-window": "Новое приватное окно",
    "link-navigation": "Навигация по ссылкам",
    "restore-closed-tab": "Восстановить закрытую вкладку",
    "duplicate-tab": "Дублировать вкладку",
    "move-tab-left": "Переместить вкладку влево",
    "move-tab-right": "Переместить вкладку вправо",
    "toggle-pin-tab": "Закрепить / открепить вкладку",
    "reload-tab": "Перезагрузить страницу",
    "stop-loading": "Остановить загрузку",
    "new-window": "Новое окно",
    "close-window": "Закрыть окно"
};

function getActiveTab() {
    return browser.tabs.query({
        active: true,
        currentWindow: true
    }).then(tabs => tabs[0] || null);
}

async function handleCommand(command) {
    const current = await getActiveTab();

    if (command === "new-tab") {
        await browser.tabs.create({});
        return;
    }

    if (command === "new-window") {
        await browser.windows.create({});
        return;
    }

    if (command === "close-window") {
        const win = await browser.windows.getCurrent();
        await browser.windows.remove(win.id);
        return;
    }

    if (command === "new-private-window") {
    await browser.windows.create({
        incognito: true
    });
    return;
}

    if (command === "restore-closed-tab") {
        const recentlyClosed = await browser.sessions.getRecentlyClosed({ maxResults: 10 });
        const firstTab = recentlyClosed.find(item => item.tab);
        const firstWindow = recentlyClosed.find(item => item.window);

        if (firstTab?.tab?.sessionId) {
            await browser.sessions.restore(firstTab.tab.sessionId);
        } else if (firstWindow?.window?.sessionId) {
            await browser.sessions.restore(firstWindow.window.sessionId);
        } else {
            console.warn("No closed tab or window to restore");
        }
        return;
    }

    if (!current) return;

    if (
    command === "link-navigation" ||
    command === "toggle-link-navigation"
) {
    try {
        await browser.tabs.sendMessage(current.id, {
            command: "toggle-link-navigation"
        });
    } catch (error) {
        console.error(
            "OneKey Navigator: link navigation error:",
            error
        );
    }

    return;
}

    if (command === "go-back") {
        await browser.tabs.goBack(current.id);
        return;
    }

    if (command === "go-forward") {
        await browser.tabs.goForward(current.id);
        return;
    }

    if (command === "close-tab") {
        await browser.tabs.remove(current.id);
        return;
    }

    if (command === "reload-tab") {
        await browser.tabs.reload(current.id);
        return;
    }

    if (command === "stop-loading") {
        try {
            await browser.tabs.sendMessage(current.id, {
                command: "stop-page-loading"
            });
        } catch (e) {
            console.warn("Could not send stop-loading command:", e);
        }
        return;
    }

    if (command === "duplicate-tab") {
        await browser.tabs.duplicate(current.id);
        return;
    }

    if (command === "toggle-pin-tab") {
        await browser.tabs.update(current.id, {
            pinned: !current.pinned
        });
        return;
    }

    if (command === "move-tab-left" || command === "move-tab-right") {
        const tabs = await browser.tabs.query({ currentWindow: true });
        const index = tabs.findIndex(tab => tab.id === current.id);
        if (index < 0) return;

        const targetIndex =
            command === "move-tab-left" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= tabs.length) return;

        // Pinned and unpinned tabs cannot cross their boundary.
        if (Boolean(tabs[index].pinned) !== Boolean(tabs[targetIndex].pinned)) {
            return;
        }

        await browser.tabs.move(current.id, {
            index: targetIndex
        });
        return;
    }

    if (command === "next-tab" || command === "previous-tab") {
        const tabs = await browser.tabs.query({ currentWindow: true });
        const index = tabs.findIndex(tab => tab.id === current.id);
        if (index < 0 || tabs.length < 2) return;

        let targetIndex =
            command === "next-tab" ? index + 1 : index - 1;

        if (targetIndex >= tabs.length) targetIndex = 0;
        if (targetIndex < 0) targetIndex = tabs.length - 1;

        await browser.tabs.update(tabs[targetIndex].id, { active: true });
    }
}

browser.commands.onCommand.addListener(async (command) => {
    try {
        await handleCommand(command);
    } catch (error) {
        console.error(
            "OneKey Navigator: command error:",
            command,
            error
        );
    }
});

browser.runtime.onMessage.addListener(async (message) => {
    if (!message) return;

    if (message.command === "open-link-new-tab") {
        if (!message.url) return;

        try {
            await browser.tabs.create({
                url: message.url
            });
        } catch (error) {
            console.error(
                "OneKey Navigator: could not open link in new tab:",
                error
            );
        }
    }
});