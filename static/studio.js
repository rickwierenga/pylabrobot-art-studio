var painting = false;
var currentColor;
var state = [];

function setUser(event) {
  const email = document.getElementById("email").value;
  if (email === "") {
    alert("Please enter your email address.");
    return;
  }
  localStorage.setItem("user", email);
  hideAskUser();
}

function getUser() {
  return localStorage.getItem("user");
}

function askUser() {
  const signupPopup = document.getElementById("signup-popup");
  signupPopup.style.display = "flex";

  var i = 0;
  var speed = 50; /* The speed/duration of the effect in milliseconds */

  function typeWriter(id, txt) {
    if (i < txt.length) {
      document.getElementById(id).innerHTML += txt.charAt(i);
      i++;
      setTimeout(() => {
        typeWriter(id, txt);
      }, speed);
    }
  }

  const welcomeText = "Welcome to the PyLabRobot Art Studio.";
  const welcomeSubtext =
    "To identify your artworks with you when printing, we need your email.";
  typeWriter("welcome-text", "Welcome to the PyLabRobot Art Studio.");
  setTimeout(() => {
    i = 0;
    typeWriter("welcome-subtext", welcomeSubtext);
  }, welcomeText.length * speed + 500);
  setTimeout(() => {
    const welcomeForm = document.getElementById("welcome-form");
    welcomeForm.style.display = "flex";
  }, welcomeText.length * speed + welcomeSubtext.length * speed + 1000);
}

function hideAskUser() {
  const signupPopup = document.getElementById("signup-popup");
  signupPopup.style.display = "none";
}

function initializeState() {
  if (localStorage.getItem("state")) {
    state = JSON.parse(localStorage.getItem("state"));
  } else {
    for (var i = 0; i < 12; i++) {
      state.push([]);
      for (var j = 0; j < 8; j++) {
        state[i].push("white");
      }
    }
  }

  updateUI();
}

function selectColor(e) {
  currentColor = e.target.id;

  // Unselect all colors in UI.
  const colors = document.getElementsByClassName("color");
  for (var i = 0; i < colors.length; i++) {
    colors[i].classList.remove("selected");
  }

  // Select the color in UI.
  e.target.classList.add("selected");
}

document.onmousedown = function () {
  painting = true;
};

document.onmouseup = function () {
  painting = false;
};

function updateState(i, j, color) {
  state[i][j] = color;

  updateUI(); // mildly inefficient

  const serialized = JSON.stringify(state);
  localStorage.setItem("state", serialized);
}

function updateUI() {
  const wells = document.getElementsByClassName("well");
  for (let k = 0; k < wells.length; k++) {
    const well = wells[k];
    const i = well.dataset["i"];
    const j = well.dataset["j"];
    well.style.backgroundColor = state[i][j];
  }
}

function makeWells() {
  const plate = document.getElementById("plate");
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 12; i++) {
      const well = document.createElement("div");
      well.classList.add("well");
      well.dataset.i = i;
      well.dataset.j = j;

      function paintCurrentColor(e) {
        updateState(i, j, currentColor);
      }
      well.onclick = paintCurrentColor;
      well.onmouseover = function (e) {
        if (painting) {
          paintCurrentColor(e);
        }
      };

      plate.appendChild(well);
    }
  }
}

var settingsWindow = document.getElementById("submissions-popup");
settingsWindow.onclick = function (event) {
  if (event.target.id === "submissions-popup") {
    closeSubmissions();
  }
};

var submissions = [];

function viewSubmissions() {
  fetch(`/my-pieces?me=${getUser()}`, {
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const submissionsTable = document.getElementById("submissions-table");
      submissionsTable.innerHTML = "";
      submissions = data;

      for (let i = 0; i < data.length; i++) {
        let submission = data[i];
        submissionsTable.innerHTML += `
          <tr>
            <td><div class="minidraw" id="minidraw-${submission.id}"></div></td>
            <td>${submission.status}</td>
            <td>2021-05-05 12:00:00</td>
            <td>
              <button class="button-secondary" onclick="loadInStudio(${submission.id})">Load in studio</button>
              <button class="button-secondary" onclick="withdraw(${submission.id})">Withdraw</button>
            </td>
          </tr>`;
        minidraw(JSON.parse(submission.content), `minidraw-${submission.id}`);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  const submissionsPopup = document.getElementById("submissions-popup");
  submissionsPopup.style.display = "flex";
}

function closeSubmissions() {
  const submissionsPopup = document.getElementById("submissions-popup");
  submissionsPopup.style.display = "none";
}

function loadInStudio(id) {
  const submission = submissions.find((s) => s.id === id);
  state = JSON.parse(submission.content);
  updateUI();
  closeSubmissions();
}

function submit(event) {
  fetch("/pieces/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: state,
      author: getUser(),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function withdraw(id) {
  fetch(`/pieces/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      viewSubmissions();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function play(event) {
  const oldState = JSON.parse(JSON.stringify(state)); // deep copy
  const colors = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "white",
    "black",
  ];

  clearCanvas();

  await sleep(500);

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    for (let j = 0; j < 12; j++) {
      for (let k = 0; k < 8; k++) {
        if (oldState[j][k] === color) {
          state[j][k] = color;
          updateUI();
          await sleep(100);
        }
      }
    }
  }
}

function rotate90() {
  const plate = document.getElementById("plate");
  const rotation = plate.style.transform;
  const rotationInt =
    parseInt(rotation.replace("rotate(", "").replace("deg)", "")) || 0;
  plate.style.transform = `rotate(${rotationInt - 90}deg)`;
  console.log(`rotate(${rotationInt - 90}deg)`);
}

function clearCanvas() {
  // Set current state to all white.
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 8; j++) {
      state[i][j] = "white";
    }
  }
  updateUI();
}

function main() {
  if (getUser() === null) {
    askUser();
  }

  makeWells();
  initializeState();
  selectColor({ target: document.getElementById("red") });
}

document.addEventListener("DOMContentLoaded", main);
