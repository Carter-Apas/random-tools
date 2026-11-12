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
const assertPass = async (page, room, direct, label) => {
  assert.equal(
    await page.locator(".firepit").count(),
    direct ? 0 : 1,
    `${label}: campfire matches pass route`,
  );
  for (const [from, to] of [
    [0, 1],
    [7, 0],
    [null, 0],
  ]) {
    const now = Date.now();
    const duration = 120000;
    const progress = 0.45;
    room.phase = "passing";
    room.activeId = room.players[to].id;
    room.move = {
      from: from === null ? null : room.players[from].id,
      to: room.activeId,
      at: now - duration * progress,
      duration,
    };
    room.readyAt = room.move.at + duration;
    room.turnStartedAt = room.readyAt;
    room.deadline = room.readyAt + 120000;
    room.botAt = Infinity;
    publish(room);
    await page.locator(".hot-vegetable").waitFor();
    await settle(page);
    const actual = await page.evaluate(
      ({ from, to }) => {
        const arena = document.querySelector(".arena");
        const vegetable = arena.querySelector(".hot-vegetable");
        const gardeners = [...arena.querySelectorAll(".gardener")];
        const target = Number.parseFloat(gardeners[to].style.left);
        const source = from === null ? target : Number.parseFloat(gardeners[from].style.left);
        const field = arena.getBoundingClientRect();
        const box = vegetable.getBoundingClientRect();
        return {
          x: Number.parseFloat(vegetable.style.left),
          source,
          target,
          fits:
            box.left >= field.left - 1 &&
            box.right <= field.right + 1 &&
            box.top >= field.top - 1 &&
            box.bottom <= field.bottom + 1,
        };
      },
      { from, to },
    );
    const expected = direct ? actual.source + (actual.target - actual.source) * progress : 50;
    assert.ok(
      Math.abs(actual.x - expected) < 1,
      `${label}: pass from seat ${from} to ${to} follows the visible route`,
    );
    assert.equal(actual.fits, true, `${label}: flying vegetable stays inside the garden`);
    if (from === 0 && /390x(400|1200)$/.test(label))
      await page.screenshot({ path: `${output}/${label.replaceAll(" ", "-")}-passing.png` });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settle(page);
  const reduced = await page.locator(".hot-vegetable").evaluate((vegetable) => ({
    x: Number.parseFloat(vegetable.style.left),
    target: Number.parseFloat(document.querySelector(".is-active").style.left),
  }));
  assert.equal(
    reduced.x,
    reduced.target,
    `${label}: reduced motion places the vegetable with its recipient`,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  freeze(room);
};
const assertResizeDuringPass = async (page, room) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const now = Date.now();
  room.phase = "passing";
  room.activeId = room.players[1].id;
  room.move = { from: room.players[0].id, to: room.activeId, at: now - 54000, duration: 120000 };
  room.readyAt = now + 66000;
  room.deadline = room.readyAt + 120000;
  room.botAt = Infinity;
  publish(room);
  await page.locator(".hot-vegetable").waitFor();
  await page.locator(".firepit").waitFor();
  await page.setViewportSize({ width: 390, height: 400 });
  await page.locator(".hot-vegetable.direct-pass").waitFor();
  await settle(page);
  assert.equal(await page.locator(".firepit").count(), 0);
  const direct = await page.locator(".hot-vegetable").evaluate((vegetable) => {
    const players = [...document.querySelectorAll(".gardener")];
    const from = Number.parseFloat(players[0].style.left);
    const to = Number.parseFloat(players[1].style.left);
    return { x: Number.parseFloat(vegetable.style.left), expected: from + (to - from) * 0.45 };
  });
  assert.ok(
    Math.abs(direct.x - direct.expected) < 1,
    "An in-flight resize switches to the direct route",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".firepit").waitFor();
  await settle(page);
  assert.equal(await page.locator(".hot-vegetable.direct-pass").count(), 0);
  const x = await page
    .locator(".hot-vegetable")
    .evaluate((vegetable) => Number.parseFloat(vegetable.style.left));
  assert.ok(Math.abs(x - 50) < 1, "Restoring space resumes the campfire route");
  freeze(room);
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

const assertGrouped = async (page, label) => {
  const bounds = await page.evaluate(() => {
    const box = (selector) => {
      const { top, bottom, height } = document.querySelector(selector).getBoundingClientRect();
      return { top, bottom, height };
    };
    return {
      width: innerWidth,
      garden: box(".arena"),
      question: box(".play-question"),
      answer: box(".answer-box"),
    };
  });
  if (bounds.width > 1100) {
    assert.ok(
      Math.abs(bounds.garden.top - bounds.question.top) < 3,
      `${label}: question aligns with garden top`,
    );
    assert.ok(
      Math.abs(bounds.garden.bottom - bounds.answer.bottom) < 3,
      `${label}: answer aligns with garden bottom`,
    );
  } else {
    assert.ok(
      bounds.garden.top - bounds.question.bottom <= 12,
      `${label}: question stays beside garden`,
    );
    assert.ok(
      bounds.answer.top - bounds.garden.bottom <= 12,
      `${label}: answer stays beside garden`,
    );
  }
};

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
              [390, 1200],
              [768, 1400],
              [320, 667],
              [390, 400],
              [320, 320],
              [844, 390],
              [844, 280],
            ]
          : [
              [1440, 1400],
              [1920, 1440],
              [1024, 1400],
              [1101, 900],
              [1440, 400],
              [1024, 360],
              [900, 320],
            ];
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          freeze(room);
          await assertVisible(page, `${engine.name()} resized ${width}x${height}`);
          await assertGrouped(page, `${engine.name()} resized ${width}x${height}`);
          if (width <= 390 || (width <= 1100 && height <= 390))
            await assertPass(page, room, true, `${engine.name()} ${width}x${height}`);
          else if (width >= 1440)
            await assertPass(page, room, false, `${engine.name()} ${width}x${height}`);
          await page.screenshot({ path: `${output}/${engine.name()}-${width}x${height}.png` });
        }
        if (mobile) {
          await page.setViewportSize({ width: 320, height: 320 });
          const longest = [...categories]
            .sort((left, right) => right.prompt.length - left.prompt.length)
            .slice(0, 8);
          for (const category of longest) {
            room.category = category;
            freeze(room);
            await assertVisible(page, `${engine.name()} long prompt: ${category.id}`);
          }
          room.category = categories.find((item) => item.id === "cheeses");
          publish(room);
        }
        await assertResizeDuringPass(page, room);
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
          await assertPass(
            page,
            room,
            true,
            `${engine.name()} keyboard height ${height}, pan ${offsetTop}`,
          );
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
    `Chromium and WebKit: wrong/correct/repeated answer focus, delayed-ack draft retention, typo identities, 8-player short viewports, direct/campfire passes, reduced-motion passes, simulated keyboard shrink/pan, rotation, hint return. Screenshots: ${output}`,
  );
} finally {
  await server.close();
}
