import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { createApp } from "../dist/server/server/app.js";
import { categories } from "../dist/server/server/categories.js";
import { publicRoom, startGame } from "../dist/server/server/game.js";

const server = createApp();
server.http.listen(0, "127.0.0.1");
await once(server.http, "listening");
const url = `http://127.0.0.1:${server.http.address().port}`;
const output = process.env.SCREENSHOT_DIR ?? "/tmp/hot-potato-viewport-qa";
await mkdir(output, { recursive: true });
const failures = [];
const publish = (room) => server.io.to(room.code).emit("state", publicRoom(room, Date.now()));
const settle = (page) => page.waitForTimeout(120);
const freeze = (room, index = 0) => {
  room.phase = "answering";
  room.activeId = room.players[index].id;
  room.turnStartedAt = Date.now();
  room.deadline = Date.now() + 120000;
  room.botAt = Infinity;
  room.draft = "";
  publish(room);
};
const assertVisible = async (page, label) => {
  await settle(page);
  const state = await page.evaluate(() => {
    const viewport = window.visualViewport;
    const visible = {
      left: viewport.offsetLeft,
      top: viewport.offsetTop,
      right: viewport.offsetLeft + viewport.width,
      bottom: viewport.offsetTop + viewport.height,
    };
    const selectors = [
      "#current-question",
      "#answer",
      ".answer-form button",
      ".turn-timer",
      ".question-info",
      ".answer-feedback",
      ".hearts",
    ];
    return {
      visible,
      overflow: document.documentElement.scrollWidth > innerWidth,
      boxes: selectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((element) => {
          const { top, bottom, left, right, width, height } = element.getBoundingClientRect();
          return { selector, top, bottom, left, right, width, height };
        }),
      ),
    };
  });
  assert.equal(state.overflow, false, `${label}: no horizontal scrolling`);
  for (const box of state.boxes) {
    assert.ok(
      box.width > 0 &&
        box.height > 0 &&
        box.top >= state.visible.top - 1 &&
        box.bottom <= state.visible.bottom + 1 &&
        box.left >= state.visible.left - 1 &&
        box.right <= state.visible.right + 1,
      `${label}: ${JSON.stringify(box)} outside ${JSON.stringify(state.visible)}`,
    );
  }
  const info = state.boxes.find((box) => box.selector === ".question-info");
  for (const selector of ["#current-question", ".turn-timer"]) {
    const box = state.boxes.find((item) => item.selector === selector);
    assert.ok(
      box.right <= info.left + 1 ||
        box.left >= info.right - 1 ||
        box.bottom <= info.top + 1 ||
        box.top >= info.bottom - 1,
      `${label}: ${selector} overlaps category info`,
    );
  }
};
const focusState = (page) =>
  page.locator("#answer").evaluate((input) => ({
    focused: document.activeElement === input,
    editable: !input.disabled && !input.readOnly,
  }));

try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      for (const mobile of [false, true]) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
          isMobile: mobile,
          hasTouch: mobile,
        });
        const token = crypto.randomUUID();
        const room = server.rooms.create(
          token,
          { name: "Garden host", avatar: "male" },
          "gentle",
          Date.now(),
        );
        for (let i = 0; i < 7; i++) server.rooms.addBot(token);
        startGame(room, Date.now());
        freeze(room);
        await context.addInitScript(
          (token) => sessionStorage.setItem("hot-potato.session", token),
          token,
        );
        const page = await context.newPage();
        page.on("pageerror", (error) => failures.push(error.message));
        await page.goto(url);
        await page.locator("#answer").waitFor();
        await assertVisible(page, `${engine.name()} initial ${mobile}`);
        await page.locator("#answer").fill("definitely invalid answer");
        const deadline = room.deadline;
        await page.locator("#answer").press("Enter");
        await page.getByText("Wrong answer. Try again!", { exact: true }).waitFor();
        assert.equal(room.deadline, deadline);
        assert.deepEqual(await focusState(page), { focused: true, editable: true });

        const socket = [...server.io.sockets.sockets.values()].find(
          (socket) => socket.handshake.auth.token === token,
        );
        const original = socket.listeners("answer")[0];
        socket.removeListener("answer", original);
        socket.on("answer", (data, ack) =>
          original(data, (result) => setTimeout(() => ack(result), 500)),
        );
        room.category = categories.find((item) => item.id === "cheeses");
        room.used = [];
        room.usedIds = [];
        publish(room);
        await page.locator("#answer").fill("chedddar");
        await page.locator(".answer-form button").click();
        assert.deepEqual(await focusState(page), { focused: true, editable: true });
        await page.locator("#answer").fill("next private answer");
        await page.waitForTimeout(600);
        assert.equal(room.used[0], "Cheddar");
        assert.equal(await page.locator("#answer").inputValue(), "next private answer");
        assert.deepEqual(await focusState(page), { focused: true, editable: true });
        freeze(room);
        await page.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
        await page.locator("#answer").fill("cheddar");
        await page.locator("#answer").press("Enter");
        await page.getByText("Already picked! Try another answer.", { exact: true }).waitFor();
        assert.deepEqual(await focusState(page), { focused: true, editable: true });

        const sizes = mobile
          ? [
              [320, 667],
              [390, 400],
              [320, 320],
              [844, 390],
              [844, 280],
            ]
          : [
              [1440, 400],
              [1024, 360],
              [900, 320],
            ];
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          freeze(room);
          await assertVisible(page, `${engine.name()} resized ${width}x${height}`);
          await page.screenshot({ path: `${output}/${engine.name()}-${width}x${height}.png` });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(() => {
          const viewport = new EventTarget();
          Object.assign(viewport, {
            width: 390,
            height: 844,
            offsetLeft: 0,
            offsetTop: 0,
            scale: 1,
          });
          Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
        });
        await page.reload();
        await page.locator("#answer").waitFor();
        for (const [height, offsetTop] of [
          [400, 0],
          [320, 80],
          [280, 140],
          [844, 0],
        ]) {
          await page.locator("#answer").focus();
          await page.evaluate(
            ({ height, offsetTop }) => {
              Object.assign(window.visualViewport, { height, offsetTop });
              window.visualViewport.dispatchEvent(new Event("resize"));
              window.visualViewport.dispatchEvent(new Event("scroll"));
            },
            { height, offsetTop },
          );
          for (const index of [0, 7]) {
            freeze(room, index);
            room.draft = "A wonderfully obscure answer";
            publish(room);
            await assertVisible(
              page,
              `${engine.name()} keyboard height ${height}, pan ${offsetTop}, seat ${index}`,
            );
          }
          if (mobile)
            await page.screenshot({ path: `${output}/${engine.name()}-keyboard-${height}.png` });
          assert.deepEqual(await focusState(page), { focused: true, editable: true });
        }
        freeze(room);
        await page.getByRole("button", { name: "Category hint and picked answers" }).click();
        await page.getByRole("button", { name: "Back to the garden" }).click();
        assert.deepEqual(await focusState(page), { focused: true, editable: true });
        await context.close();
        server.rooms.remove(token, Date.now());
      }
    } finally {
      await browser.close();
    }
  }
  assert.deepEqual(failures, []);
  console.log(
    `Chromium and WebKit: wrong/correct/repeated answer focus, delayed-ack draft retention, typo identities, 8-player short viewports, simulated keyboard shrink/pan, rotation, hint return. Screenshots: ${output}`,
  );
} finally {
  await server.close();
}
