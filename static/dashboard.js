//const BASE_URL = "http://0.0.0.0:5003";
const BASE_URL = "https://artstudio.pylabrobot.org";
var interval;
var pieces = [];

function buildDashboard(data) {
  var dashboard = document.getElementById("dashboard-table");
  var history = document.getElementById("history-table");
  var current = document.getElementById("current-task");
  dashboard.innerHTML = "";
  history.innerHTML = "";
  current.innerHTML = "No current task";
  pieces = data;

  for (var i = 0; i < data.length; i++) {
    const piece = data[i];
    const html = `
    <tr>
      <td><div class="minidraw" id="minidraw-${piece.id}"></div></td>
      <td>Task ${piece.id}</td>
      <td>${piece.author}</td>
      <td>${piece.status}</td>
      <td>1:00</td>
      ${
        piece.status === "queued"
          ? `
        <td>
          <button onclick="start('${piece.id}')">Start</button>
          <button onclick="remove('${piece.id}')">Remove</button>
        </td> `
          : `
          <td>
            <button onclick="requeue('${piece.id}')">Requeue</button>
            <button onclick="remove('${piece.id}')">Remove</button>
          </td> `
      }
    </tr>
    `;

    if (piece.status === "done") {
      history.innerHTML += html;
    } else if (piece.status === "running") {
      current.innerHTML = `
        <div class="minidraw" id="minidraw-${piece.id}"></div>
        <p>Current task: ${piece.id} by ${piece.author}</p>
        <button onclick="requeue('${piece.id}')">Requeue</button>`;
    } else {
      dashboard.innerHTML += html;
    }
    console.log(JSON.parse(piece.content));
    minidraw(JSON.parse(piece.content), `minidraw-${piece.id}`);
  }
}

function longPoll() {
  fetch(`${BASE_URL}/pieces?n=50`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      buildDashboard(data);
    });
}

function getCurrentTask() {
  fetch(`/current`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const element = document.getElementById("current-task");
      if (data === null) {
        element.innerHTML = "No current task";
      } else {
        element.innerHTML = `Current task: ${data.id} by ${data.author}`;
      }
    });
}

function requeue(task_id) {
  fetch(`${BASE_URL}/pieces/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: task_id, status: "queued" }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("requeued");
    });
}

function start(task_id) {
  let task = pieces.find((task) => task.id == task_id);
  fetch(`/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("started");
    });
}

function remove(task_id) {
  fetch(`/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: task_id }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("deleted");
    });
}

function initialize() {
  interval = setInterval(() => {
    longPoll();
  }, 1000);
  longPoll();
}

document.addEventListener("DOMContentLoaded", initialize);
