(() => {
    let navigationMode = false;
    let elements = [];
    let currentIndex = -1;
    let lastElement = null;

    const HIGHLIGHT_CLASS = "onekey-navigation-selected";

    function isVisible(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            parseFloat(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function isClickable(element) {
        if (!isVisible(element)) {
            return false;
        }

        const tag = element.tagName.toLowerCase();

        // Обычная ссылка
        if (tag === "a" && element.href) {
            return true;
        }

        // Кнопка
        if (tag === "button") {
            return true;
        }

        // Явно обозначенный интерактивный элемент
        const role = element.getAttribute("role");

        if (role === "button" || role === "link") {
            return true;
        }

        // onclick
        if (element.hasAttribute("onclick")) {
            return true;
        }

        // tabindex
        if (
            element.hasAttribute("tabindex") &&
            element.getAttribute("tabindex") !== "-1"
        ) {
            return true;
        }

        // Элемент, который сайт показывает как кликабельный
        const style = getComputedStyle(element);

        if (style.cursor === "pointer") {
            return true;
        }

        return false;
    }

    function collectElements() {
        const all = document.querySelectorAll("*");

        elements = Array.from(all).filter(isClickable);

        // Не показываем отдельно вложенные элементы,
        // если они находятся внутри другого кликабельного элемента.
        elements = elements.filter(element => {
            let parent = element.parentElement;

            while (parent) {
                if (
                    elements.includes(parent) &&
                    element.tagName !== "A" &&
                    element.tagName !== "BUTTON"
                ) {
                    return false;
                }

                parent = parent.parentElement;
            }

            return true;
        });
    }

    function removeHighlight() {
        if (lastElement) {
            lastElement.classList.remove(HIGHLIGHT_CLASS);
            lastElement = null;
        }
    }

    function highlight(element) {
        removeHighlight();

        if (!element) {
            return;
        }

        element.classList.add(HIGHLIGHT_CLASS);
        lastElement = element;

        element.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest"
        });
    }

    function getCenter(element) {
        const rect = element.getBoundingClientRect();

        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function findNearestInDirection(direction) {
        if (!elements.length) {
            return -1;
        }

        if (currentIndex === -1) {
            return 0;
        }

        const current = elements[currentIndex];
        const origin = getCenter(current);

        let bestIndex = -1;
        let bestScore = Infinity;

        elements.forEach((element, index) => {
            if (index === currentIndex) {
                return;
            }

            const point = getCenter(element);

            const dx = point.x - origin.x;
            const dy = point.y - origin.y;

            let primary;
            let secondary;

            if (direction === "right") {
                if (dx <= 5) {
                    return;
                }

                primary = dx;
                secondary = Math.abs(dy);
            }

            else if (direction === "left") {
                if (dx >= -5) {
                    return;
                }

                primary = -dx;
                secondary = Math.abs(dy);
            }

            else if (direction === "down") {
                if (dy <= 5) {
                    return;
                }

                primary = dy;
                secondary = Math.abs(dx);
            }

            else if (direction === "up") {
                if (dy >= -5) {
                    return;
                }

                primary = -dy;
                secondary = Math.abs(dx);
            }

            const score = primary + secondary * 1.5;

            if (score < bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });

        return bestIndex;
    }

    function move(direction) {
        collectElements();

        if (!elements.length) {
            return;
        }

        const nextIndex = findNearestInDirection(direction);

        if (nextIndex === -1) {
            return;
        }

        currentIndex = nextIndex;

        highlight(elements[currentIndex]);
    }

    function activate() {
        if (currentIndex === -1 || !elements[currentIndex]) {
            return;
        }

        elements[currentIndex].click();
    }

    function openInNewTab() {
        if (currentIndex === -1 || !elements[currentIndex]) {
            return;
        }

        const element = elements[currentIndex];

        let url = null;

        // Сам элемент является ссылкой
        if (
            element.tagName.toLowerCase() === "a" &&
            element.href
        ) {
            url = element.href;
        }

        // Внутри элемента находится ссылка
        if (!url) {
            const link = element.querySelector("a[href]");

            if (link && link.href) {
                url = link.href;
            }
        }

        if (url) {
         browser.runtime.sendMessage({
    command: "open-link-new-tab",
    url: url
}).then(() => {
    console.log("OneKey Navigator: message sent to background");
}).catch(error => {
    console.error(
        "OneKey Navigator: sendMessage error:",
        error
    );
});

return;
        }

        // Если URL определить нельзя,
        // выполняем обычный клик.
        element.click();
    }

    function startNavigation() {
        navigationMode = true;

        collectElements();

        if (!elements.length) {
            console.log(
                "OneKey Navigator: no clickable elements found"
            );

            return;
        }

        currentIndex = 0;

        highlight(elements[currentIndex]);

        console.log(
            "OneKey Navigator: link navigation ON, elements:",
            elements.length
        );
    }

    function stopNavigation() {
        navigationMode = false;

        removeHighlight();

        elements = [];
        currentIndex = -1;

        console.log(
            "OneKey Navigator: link navigation OFF"
        );
    }

    function toggleNavigation() {
        if (navigationMode) {
            stopNavigation();
        } else {
            startNavigation();
        }
    }

    window.addEventListener(
        "keydown",
        event => {
            
            if (!navigationMode) {
                return;
            }

            const tag = event.target.tagName.toLowerCase();

            // Не вмешиваемся в поля ввода
            if (
                tag === "input" ||
                tag === "textarea" ||
                tag === "select" ||
                event.target.isContentEditable
            ) {
                return;
            }

            switch (event.key) {

                case "ArrowRight":
                    event.preventDefault();
                    event.stopPropagation();
                    move("right");
                    break;

                case "ArrowLeft":
                    event.preventDefault();
                    event.stopPropagation();
                    move("left");
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    event.stopPropagation();
                    move("down");
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    event.stopPropagation();
                    move("up");
                    break;

                case "Enter":
                    event.preventDefault();
                    event.stopPropagation();

                    if (event.shiftKey) {
                        openInNewTab();
                    } else {
                        activate();
                    }

                    break;

                case "F11":
                    event.preventDefault();
                    event.stopPropagation();
                    stopNavigation();
                    break;
            }
        },
        true
    );

    // Получаем команду F11 от background.js
    browser.runtime.onMessage.addListener(message => {
        if (
            message &&
            message.command === "toggle-link-navigation"
        ) {
            toggleNavigation();
        }
    });

    // Подсветка выбранного элемента
    const style = document.createElement("style");

    style.textContent = `
        .${HIGHLIGHT_CLASS} {
            outline: 4px solid #00aaff !important;
            outline-offset: 3px !important;
            box-shadow:
                0 0 0 3px rgba(0, 170, 255, 0.25),
                0 0 15px rgba(0, 170, 255, 0.7) !important;
            position: relative !important;
            z-index: 2147483647 !important;
        }
    `;

    document.documentElement.appendChild(style);

    
})();