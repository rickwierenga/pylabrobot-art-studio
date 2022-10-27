# PyLabRobot Art Studio

**See [artstudio.pylabrobot.org](https://artstudio.pylabrobot.org).**

Art Studio for [PyLabRobot](https://github.com/pylabrobot/pylabrobot): getting creative with 96 well plates, waterpaint, and liquid handling robots.

Art studio:
![Screenshot](./.github/artstudio.png)

Master dashboard:
![Screenshot](./.github/dashboard.png)

## Gallery

![Image](./.github/1.JPG)
![Image](./.github/2.JPG)
![Image](./.github/3.JPG)
![Image](./.github/4.JPG)
![Image](./.github/5.JPG)
![Image](./.github/6.JPG)

## Developers

**NOTE: This is a demo project**:

- It uses long polling.
- Artworks/pieces/submissions are passed around inefficiently.

```bash
# on a server, serves studio
TOKEN="secret" python server.py

# on computer with robot, serves dashboard and controls robot
TOKEN="secret" python executor.py
```

---

_This project was developed for the Sculpting Evolution Group, to present at the Media Lab's Members Meeting, Fall 2022_
