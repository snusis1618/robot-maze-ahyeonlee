# ESCAPE_100 — 10×10 Robot Maze Simulator

프로그래밍 수업의 **함수(function), 조건문(if/else), 반복문(for/while)** 활용을 보여주기 위해 만든 Vanilla JavaScript 웹앱입니다.

사용자는 10×10 미로에서 로봇의 시작 칸과 방향을 선택합니다. 로봇은 매우 단순한 규칙만 사용합니다.

1. 앞이 비어 있으면 한 칸 전진
2. 앞이 벽이면 오른쪽으로 90° 회전
3. 출구 도달 시 즉시 성공
4. 최대 100번의 행동만 허용
5. 같은 `(위치 + 방향)` 상태가 반복되면 loop로 판단해 실패

프레임워크나 외부 라이브러리를 사용하지 않았습니다.

---

## 1. 프로젝트 구조

```text
robot-maze/
├── index.html
├── style.css
├── script.js
└── README.md
```

- `index.html` : 화면 구조
- `style.css` : 레트로 RPG 스타일 UI, 애니메이션, 반응형 레이아웃
- `script.js` : 미로 데이터, 입력 처리, 로봇 알고리즘, 전수 시뮬레이션
- `README.md` : 과제 설명 및 실행/배포 방법

---

## 2. 미로를 아무렇게나 만들지 않은 이유

이 프로젝트는 미로를 먼저 만든 뒤 운에 맡기지 않았습니다.

이론적으로 시작 상태는 다음과 같습니다.

```text
100개 칸 × 4개 방향 = 400개 상태
```

현재 고정 미로에는 벽 칸이 18개 있으므로:

```text
400 total states
72 blocked states = 18 wall cells × 4 directions
328 playable states
```

`script.js`의 `analyzeAllStartStates()`가 **중첩 for문**으로 모든 상태를 검사합니다.

현재 미로의 결과는:

```text
164 SUCCESS
164 FAIL
```

즉 플레이 가능한 시작 상태가 정확히 50:50으로 성공/실패가 갈리도록 선택했습니다.

또한 같은 칸이라도 시작 방향에 따라 결과가 달라지는 방이 다수 존재합니다. 예를 들어 **37번 방**은:

```text
37 + ↑  → SUCCESS
37 + ←  → FAIL (LOOP)
```

따라서 사용자가 방향까지 선택하는 이유가 실제 결과에 반영됩니다.

---

## 3. 수업 문법이 어디에 사용되었나?

### A. 사용자 정의 함수 — `function`

로봇 기능을 하나의 긴 코드로 작성하지 않고 역할별로 나눴습니다.

```js
function isWall(row, col) { ... }
function turnRight(direction) { ... }
function moveRobot(robot) { ... }
function simulateRobotFast(startCell, startDirection) { ... }
async function simulateRobot() { ... }
```

발표할 때는 다음처럼 설명할 수 있습니다.

> “각 함수가 하나의 역할만 담당하도록 분리했습니다. `isWall()`은 벽 판단, `turnRight()`는 방향 전환, `moveRobot()`은 위치 변경을 담당합니다.”

### B. 조건문 — `if / else`

로봇의 핵심 판단에 직접 사용됩니다.

```js
if (canMoveForward(robot.cell, robot.direction)) {
  moveRobot(robot);
} else {
  robot.direction = turnRight(robot.direction);
}
```

즉:

```text
앞이 비었는가?
├─ YES → 전진
└─ NO  → 오른쪽 회전
```

### C. `while` 반복문

로봇이 출구를 찾거나 실패 조건에 도달할 때까지 같은 판단을 계속 반복합니다.

```js
while (robot.actions < MAX_ACTIONS) {
  ...
}
```

Python에서 배운 아래 구조와 같은 개념입니다.

```python
i = 0
while i < 5:
    print(i)
    i += 1
```

브라우저에서는 문법이 JavaScript이기 때문에 괄호와 `{ }`가 들어가지만, **조건이 참인 동안 반복한다는 원리는 같습니다.**

### D. `for` 반복문

두 곳에서 의미 있게 사용됩니다.

1. 100개의 미로 칸 생성
2. 100개 칸 × 4방향 = 400개 시작 상태 전수 검사

```js
for (let cell = 1; cell <= TOTAL_CELLS; cell += 1) {
  for (let d = 0; d < DIRECTION_ORDER.length; d += 1) {
    ...
  }
}
```

따라서 발표용 한 줄 요약은 다음과 같습니다.

> **입력 → 시작 칸 + 방향 → 함수가 로봇 상태 갱신 → if/else가 벽 판단 → while이 탈출까지 반복 → for가 전체 시작점을 실험**

### E. 배열 / 객체 / Set

```js
const DIRECTION_ORDER = ["N", "E", "S", "W"];
```

방향 순서는 배열로 관리합니다.

```js
const DIRECTIONS = {
  N: { row: -1, col: 0, arrow: "↑", label: "NORTH" },
  ...
};
```

방향별 이동량은 객체로 관리합니다.

```js
const WALL_CELLS = new Set([3, 11, 19, ...]);
```

벽 칸과 방문 상태는 `Set`으로 관리해서 빠르게 포함 여부를 확인합니다.

---

## 4. 실행 방법 — 가장 쉬운 방법

### 방법 1: 그냥 열기

`index.html` 파일을 더블클릭해서 Chrome 등 브라우저로 열면 됩니다.

이 프로젝트는 서버가 없어도 작동하도록 만들었습니다.

### 방법 2: VS Code Live Server

1. VS Code로 `robot-maze` 폴더 열기
2. Extensions에서 **Live Server** 설치
3. `index.html` 우클릭
4. **Open with Live Server** 클릭

---

## 5. 게임 방법

1. `[ START ]` 클릭
2. 1~100 중 벽이 아닌 칸 클릭
   - 또는 `ROOM` 입력창에 번호 입력
3. 방향키 UI `↑ ↓ ← →` 중 하나 선택
   - 실제 키보드 방향키도 사용 가능
4. `[ RUN SIMULATION ]` 클릭
5. 로봇의 이동/회전 과정을 관찰
6. 필요하면 `×1 / ×2 / ×4`로 속도 변경
7. 성공하면 가상 픽셀 100원 코인 획득
8. 실패하면 다른 시작 위치/방향으로 다시 시도

---

## 6. GitHub에 업로드하기

### 웹사이트에서 하는 쉬운 방법

1. GitHub 로그인
2. 우측 상단 `+` → **New repository**
3. Repository name 예시: `robot-maze`
4. **Create repository**
5. 생성된 저장소에서 **Add file → Upload files**
6. 이 폴더의 `index.html`, `style.css`, `script.js`, `README.md` 업로드
7. 아래쪽 **Commit changes** 클릭

### Git 명령어를 사용하는 방법

```bash
git init
git add .
git commit -m "Initial ESCAPE_100 project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/robot-maze.git
git push -u origin main
```

`YOUR_USERNAME`은 본인의 GitHub 아이디로 바꾸면 됩니다.

---

## 7. Cloudflare Pages 배포하기

이 프로젝트는 HTML/CSS/JavaScript 정적 사이트라 별도의 build 과정이 필요 없습니다.

1. Cloudflare Dashboard 로그인
2. **Workers & Pages** 이동
3. **Create application** 또는 **Create** 선택
4. **Pages** → GitHub 저장소 연결
5. `robot-maze` repository 선택
6. 배포 설정

```text
Framework preset: None
Production branch: main
Build command: exit 0
Build output directory: .
Root directory: 비워두기 (repository root 사용)
```

이 프로젝트는 `index.html`이 repository 최상위 폴더에 있으므로 Build output directory를 `.`(현재 폴더)로 지정하면 됩니다. Cloudflare 공식 문서에서도 프레임워크가 없는 정적 사이트는 별도 프레임워크 preset이 필요 없으며, 빌드가 필요하지 않을 때 `exit 0` 같은 성공 종료 명령을 사용할 수 있다고 안내합니다.

7. **Save and Deploy**
8. 배포가 완료되면 `*.pages.dev` 주소가 생성됩니다.

---

## 8. 발표 때 보여주기 좋은 코드 순서

교수님께 코드를 처음부터 끝까지 전부 보여줄 필요는 없습니다. `script.js`에서 다음 다섯 부분만 보여주면 구조가 명확합니다.

```text
1. WALL_CELLS / DIRECTIONS
   → 배열·객체·Set으로 상태 관리

2. isWall()
   → 함수 + if/else

3. moveRobot() / turnRight()
   → 사용자 정의 함수

4. simulateRobot()
   → while + if/else + 함수 호출

5. analyzeAllStartStates()
   → 중첩 for문으로 400개 상태 검사
```

발표 문장 예시:

> “미로의 벽과 방향 정보를 객체와 Set으로 관리했습니다. 로봇의 행동은 여러 함수로 분리했고, 매 행동마다 if/else로 전진과 회전을 결정합니다. 이 판단은 while문으로 최대 100번까지 반복됩니다. 또한 특정 미로가 너무 쉽거나 어렵지 않도록 중첩 for문으로 100개 칸과 4개 방향, 총 400개의 이론적 시작 상태를 전수 검사했습니다.”

---

## 9. JavaScript와 Python의 관계

수업에서 Python으로 아래처럼 배웠더라도:

```python
i = 0
while i < 5:
    print(i)
    i += 1
```

이 과제를 JavaScript로 구현해도 **배우는 핵심 개념은 동일합니다.**

JavaScript에서는 같은 구조를 다음처럼 씁니다.

```js
let i = 0;
while (i < 5) {
  console.log(i);
  i += 1;
}
```

웹 브라우저에서 HTML 화면을 직접 움직여야 하므로 이번 프로젝트는 JavaScript가 적합합니다.

---

## 10. 저작권 / 디자인 메모

전체 분위기는 고전적인 흑백 레트로 RPG UI에서 영감을 받았지만, 특정 게임의 로고·캐릭터·그래픽·음원·에셋을 복제하지 않았습니다. 성공 보상의 100원 코인 역시 실제 한국 100원 동전 이미지를 사용하지 않고 CSS로 만든 가상의 게임 코인입니다.
