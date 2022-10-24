function minidraw(content, id) {
  const minidraw = document.getElementById(id);
  minidraw.innerHTML = "";
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 12; i++) {
      const well = document.createElement("div");
      well.classList.add("miniwell");
      well.style.backgroundColor = content[i][j];
      minidraw.appendChild(well);
    }
  }
}
