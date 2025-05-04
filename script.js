const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.getElementById("send-btn");
let userMessage = null;
const inputInitHeight = chatInput.scrollHeight;

// Public bathrooms dataset state
let bathroomsData = [];
let bathroomsShown = 0;

// Gemini API configuration (for other queries)
const API_KEY = "AIzaSyAQRgdyijsMGE1pBcp7BmrR8BbbeAcaGxc";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Create chat message element
const createChatLi = (message, className, isHTML = false) => {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);
  let chatContent = className === "outgoing"
    ? `<p></p>`
    : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
  chatLi.innerHTML = chatContent;
  if (isHTML) {
    chatLi.querySelector("p").innerHTML = message;
  } else {
    chatLi.querySelector("p").textContent = message;
  }
  return chatLi;
};

// Fetch and display bathrooms with clickable map links
const fetchAndShowBathrooms = async (chatElement, initial = false) => {
  const messageElement = chatElement.querySelector("p");

  if (bathroomsData.length === 0) {
    messageElement.textContent = "Looking up public bathrooms in NYC...";
    try {
      const response = await fetch("https://data.cityofnewyork.us/resource/i7jb-7jku.json");
      bathroomsData = await response.json();
      bathroomsShown = 0;
    } catch (error) {
      messageElement.textContent = "Error fetching bathrooms: " + error.message;
      return;
    }
  }

  let startIdx, endIdx;
  if (initial) {
    startIdx = 0;
    endIdx = 5;
    bathroomsShown = 5;
  } else {
    startIdx = bathroomsShown;
    endIdx = bathroomsShown + 10;
    bathroomsShown += 10;
  }

  const toShow = bathroomsData.slice(startIdx, endIdx);
  if (toShow.length === 0) {
    messageElement.textContent = "No more bathrooms to show!";
    return;
  }

  let list = toShow.map((bathroom, idx) => {
    const name = bathroom.facility_name || "Unnamed";
    const location = bathroom.location || "Here is the address";
    let mapsUrl = "#";
    if (bathroom.latitude && bathroom.longitude) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${bathroom.latitude},${bathroom.longitude}`;
    } else if (location !== "No address") {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }
    return `${startIdx + idx + 1}. ${name} - <a href="${mapsUrl}" target="_blank" rel="noopener">${location}</a>`;
  }).join('<br>');

  messageElement.innerHTML = (initial ? "Here are 5 public bathrooms in NYC:<br>" : "Here are more public bathrooms:<br>") + list;
};

// Generate chatbot or API response
const generateResponse = async (chatElement) => {
  const messageElement = chatElement.querySelector("p");
  const msg = userMessage.toLowerCase();

  if (msg.includes("public bathroom")) {
    bathroomsData = []; // Reset data to force fresh fetch
    fetchAndShowBathrooms(chatElement, true);
    return;
  }

  if (msg.includes("more bathrooms")) {
    if (bathroomsData.length === 0) {
      messageElement.textContent = "Please ask for 'public bathroom' first!";
    } else {
      fetchAndShowBathrooms(chatElement, false);
    }
    return;
  }

  // Gemini API fallback for other queries
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: userMessage }]
      }]
    }),
  };
  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    messageElement.textContent = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
  } catch (error) {
    messageElement.classList.add("error");
    messageElement.textContent = error.message;
  } finally {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }
};

// Handle sending a chat message
const handleChat = () => {
  userMessage = chatInput.value.trim();
  if (!userMessage) return;
  chatInput.value = "";
  chatInput.style.height = `${inputInitHeight}px`;
  // Use isHTML=true for bot messages that may contain HTML (bathroom lists)
  const outgoingLi = createChatLi(userMessage, "outgoing");
  chatbox.appendChild(outgoingLi);
  chatbox.scrollTo(0, chatbox.scrollHeight);
  setTimeout(() => {
    // Check if the next bot message should be HTML
    const msg = userMessage.toLowerCase();
    const isHTML = msg.includes("public bathroom") || msg.includes("more bathrooms");
    const incomingLi = createChatLi("Thinking...", "incoming", isHTML);
    chatbox.appendChild(incomingLi);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    generateResponse(incomingLi);
  }, 600);
};

// Input and button event listeners
chatInput.addEventListener("input", () => {
  chatInput.style.height = `${inputInitHeight}px`;
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
    e.preventDefault();
    handleChat();
  }
});
sendChatBtn.addEventListener("click", handleChat);
sendChatBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") handleChat();
});

// Chatbot open/close toggles
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

