document.addEventListener("DOMContentLoaded", () => {
    let chatBtn = document.getElementById("chat-btn");
    let chatContainer = document.getElementById("chat-container");
    let closeChat = document.getElementById("close-chat");
    let chatInput = document.getElementById("chat-input");
    let sendChatBtn = document.getElementById("send-chat");
    let chatMessages = document.getElementById("chat-messages");
    let typingIndicator = document.getElementById("typing-indicator");

    let typingUsers = new Set();
    let typingTimeouts = {};
    let chatSocket = null;
    let isChatOpen = false;

    function openChat() {
        chatContainer.classList.add("show");
        isChatOpen = true;
    }

    function closeChatBox() {
        chatContainer.classList.remove("show");
        setTimeout(() => (chatContainer.style.display = "none"), 300);
        isChatOpen = false;
    }

    chatBtn.addEventListener("click", () => {
        if (isChatOpen) {
            closeChatBox();
        } else {
            let rect = chatBtn.getBoundingClientRect();
            chatContainer.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            chatContainer.style.right = `${window.innerWidth - rect.right + 10}px`;

            chatContainer.style.display = "flex";
            setTimeout(openChat, 10);
        }
    });

    closeChat.addEventListener("click", closeChatBox);

    function initializeWebSocket() {
        chatSocket = new WebSocket(
            `ws://${window.location.host}/ws/chat/${sessionStorage.getItem("room")}/`
        );

        chatSocket.onmessage = function (event) {
            let data = JSON.parse(event.data);

            if (data.typing) {
                showTypingIndicator(data.username);
            } else {
                let messageElement = document.createElement("div");
                messageElement.classList.add("message", data.username === sessionStorage.getItem("name") ? "user" : "other");
                messageElement.textContent = `${data.username}: ${data.message}`;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                removeTypingIndicator(data.username);
            }
        };

        chatSocket.onclose = () => {
            setTimeout(initializeWebSocket, 2000);
        };
    }

    initializeWebSocket();

    sendChatBtn.addEventListener("click", () => {
        let message = chatInput.value.trim();
        if (message !== "") {
            chatSocket.send(JSON.stringify({ username: sessionStorage.getItem("name"), message }));
            chatInput.value = "";
        }
    });

    chatInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendChatBtn.click();
        }

        chatSocket.send(JSON.stringify({ username: sessionStorage.getItem("name"), typing: true }));

        if (typingTimeouts[sessionStorage.getItem("name")]) {
            clearTimeout(typingTimeouts[sessionStorage.getItem("name")]);
        }

        typingTimeouts[sessionStorage.getItem("name")] = setTimeout(() => {
            chatSocket.send(JSON.stringify({ username: sessionStorage.getItem("name"), typing: false }));
        }, 1500);
    });

    function showTypingIndicator(username) {
        typingUsers.add(username);
        typingIndicator.textContent = `${Array.from(typingUsers).join(", ")} is typing...`;
        typingIndicator.classList.add("show");
    }

    function removeTypingIndicator(username) {
        typingUsers.delete(username);
        if (typingUsers.size === 0) {
            typingIndicator.classList.remove("show");
        } else {
            typingIndicator.textContent = `${Array.from(typingUsers).join(", ")} is typing...`;
        }
    }
});
