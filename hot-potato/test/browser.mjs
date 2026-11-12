import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";

import { chromium } from "playwright";

import { createApp } from "../dist/server/server/app.js";
import { categories } from "../dist/server/server/categories.js";
import { publicRoom } from "../dist/server/server/game.js";

const server = createApp();
server.http.listen(0, "127.0.0.1");
await once(server.http, "listening");
const url = `http://127.0.0.1:${server.http.address().port}`;
const browser = await chromium.launch({ headless: true });
const failures = [];
const output = process.env.SCREENSHOT_DIR ?? "/tmp/hot-potato-qa";
await mkdir(output, { recursive: true });
const contexts = [];
const pageFor = async (viewport = { width: 1440, height: 1000 }) => {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  return page;
};
const waitFor = async (predicate, message) => {
  const deadline = Date.now() + 10000;
  while (!(await predicate())) {
    assert.ok(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
const noOverflow = async (page) =>
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
const screenshot = async (page, name) =>
  page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
const assertApprovedCharacters = async (page) => {
  for (const avatar of ["male", "female"]) {
    const approved = await readFile(
      new URL(`../art/concepts/fidelity-study/${avatar}-64x96.png`, import.meta.url),
    );
    const result = await page.evaluate(
      async ({ avatar, base64 }) => {
        const load = (url) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
          });
        const approved = await load(`data:image/png;base64,${base64}`);
        const portrait = await load(`/assets/${avatar}.png`);
        const sheet = await load(`/assets/${avatar}-idle.png`);
        const pixels = (image) => {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 96;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, 64, 96).data;
        };
        const expected = pixels(approved),
          actual = pixels(portrait),
          firstFrame = pixels(sheet);
        const sizes = {};
        for (const pose of ["idle", "hold", "charred", "down"]) {
          const image = await load(`/assets/${avatar}-${pose}.png`);
          sizes[pose] = [image.width, image.height];
        }
        return {
          identical: expected.every((value, i) => value === actual[i] && value === firstFrame[i]),
          portrait: [portrait.width, portrait.height],
          sizes,
        };
      },
      { avatar, base64: approved.toString("base64") },
    );
    assert.deepEqual(result, {
      identical: true,
      portrait: [64, 96],
      sizes: { idle: [128, 96], hold: [128, 96], charred: [64, 96], down: [64, 96] },
    });
  }
};
const figuresFitArena = async (page) => {
  const result = await page.locator(".arena").evaluate((arena) => {
    const bounds = arena.getBoundingClientRect();
    return [...arena.querySelectorAll(".character-figure, .gardener-name, .hearts")].every(
      (element) => {
        const box = element.getBoundingClientRect();
        return (
          box.left >= bounds.left + 2 &&
          box.right <= bounds.right - 2 &&
          box.top >= bounds.top + 2 &&
          box.bottom <= bounds.bottom - 2
        );
      },
    );
  });
  assert.equal(result, true, "Characters, names, and hearts fit inside the garden");
};
const publish = (room) => server.io.to(room.code).emit("state", publicRoom(room, Date.now()));
const answerOn = async (page, answer) => {
  await page.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  await page.locator("#answer").fill(answer);
  await page.getByRole("button", { name: "Pass it!" }).click();
};

try {
  const host = await pageFor();
  await host.goto(url);
  await host.getByRole("button", { name: "Host a garden" }).waitFor();
  await assertApprovedCharacters(host);
  await figuresFitArena(host);
  await screenshot(host, "desktop-home");
  await host.getByRole("button", { name: "How to play" }).click();
  await host.getByRole("dialog").waitFor();
  await host.keyboard.press("Escape");
  await host.getByLabel("Your name", { exact: true }).fill("Carter");
  await host.getByLabel("How hot?", { exact: true }).selectOption("gentle");
  await host.getByRole("button", { name: "Host a garden" }).click();
  await host.getByText("Gather your gang").waitFor();
  const room = [...server.rooms.rooms.values()][0];
  const guest = await pageFor({ width: 390, height: 844 });
  await guest.goto(`${url}/?room=${room.code}`);
  await guest.getByLabel("Your name", { exact: true }).fill("Fern");
  await guest.getByRole("button", { name: "Girl", exact: false }).click();
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await guest.getByText("Waiting for the host to start…").waitFor();
  assert.equal(await host.locator(".gardener").count(), 2);
  await host.getByRole("button", { name: "Let's get cooking!" }).click();
  await host.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  await guest.locator("#answer").fill("private future answer");
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(room.draft, "");
  await host.locator("#answer").fill("live words");
  await guest.locator(".speech-bubble output").filter({ hasText: "live words" }).waitFor();
  assert.equal(room.draft, "live words");
  assert.equal(await host.locator(".speech-bubble output").innerText(), "live words");
  assert.equal(await guest.locator(".answer-box .speech-bubble").count(), 0);
  assert.equal(await guest.locator("#answer").inputValue(), "private future answer");
  const answer = room.category.answers[0].label;
  await answerOn(host, "definitely not an answer");
  await host.getByText("Wrong answer. 2 seconds lost — try again!").waitFor();
  assert.equal(
    await host.locator("#answer").evaluate((input) => document.activeElement === input),
    true,
  );
  assert.equal(await host.locator("#answer").getAttribute("aria-invalid"), "true");
  await answerOn(host, answer);
  await guest.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  assert.equal(await guest.locator("#answer").inputValue(), "private future answer");
  await host
    .locator(".speech-bubble output")
    .filter({ hasText: "private future answer" })
    .waitFor();
  await answerOn(guest, answer);
  await guest.getByText("Already picked! 2 seconds lost — try another.").waitFor();
  assert.equal(
    await guest.locator("#answer").evaluate((input) => document.activeElement === input),
    true,
  );
  const nextAnswer = room.category.answers.find((item) => !room.used.includes(item.label)).label;
  await answerOn(guest, nextAnswer);
  await host.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  await noOverflow(guest);
  await screenshot(host, "desktop-game");
  await figuresFitArena(guest);
  await screenshot(guest, "mobile-game");
  room.category = {
    ...categories.find((item) => item.id === "cheeses"),
    id: "test-small",
    vegetable: "turnip",
    answers: categories.find((item) => item.id === "cheeses").answers.slice(0, 2),
  };
  room.categoryGoal = 2;
  room.used = [];
  room.usedIds = [];
  publish(room);
  await answerOn(host, "Cheddar");
  await guest.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  await answerOn(guest, "Brie");
  await waitFor(() => room.category.id !== "test-small", "Category should change when exhausted");
  assert.notEqual(room.category.vegetable, "turnip");
  await guest.reload();
  await guest.locator(".room-invite").waitFor();
  assert.equal(await guest.locator(".gardener").count(), 2);
  await noOverflow(guest);
  await waitFor(() => room.phase === "answering", "Player receives the vegetable");
  room.penaltyMs = 0;
  for (const [stage, elapsed] of [
    ["warm", 0.4],
    ["hands", 0.7],
    ["body", 0.9],
  ]) {
    const now = Date.now();
    room.turnStartedAt = now - room.turnDurationMs * elapsed;
    room.deadline = room.turnStartedAt + room.turnDurationMs;
    publish(room);
    await guest.locator(`.is-active .heat-${stage}`).waitFor();
    await screenshot(guest, `mobile-heat-${stage}`);
  }
  room.turnStartedAt = Date.now();
  room.deadline = room.turnStartedAt + room.turnDurationMs;
  publish(room);
  for (let i = 0; i < 8 && room.status === "playing"; i += 1) {
    room.phase = "answering";
    room.deadline = Date.now() - 1;
    await waitFor(() => room.phase === "charred", "Player should char");
    if (i === 0) await screenshot(guest, "mobile-charred");
    room.readyAt = Date.now() - 1;
    await waitFor(
      () => room.phase !== "charred" || room.status === "finished",
      "Charring should resolve",
    );
  }
  assert.equal(room.status, "finished");
  assert.equal(await guest.locator(".figure-down").count(), 1);
  await guest.locator(".winner-banner").waitFor();
  await screenshot(host, "desktop-winner");
  const hostPage =
    room.players.find((player) => player.id === room.hostId).name === "Carter" ? host : guest;
  await hostPage.getByRole("button", { name: "Play again", exact: true }).click();
  await waitFor(() => room.round === 2, "Host can start rematch");
  assert.ok(room.players.every((player) => player.hearts === 3));
  for (const width of [320, 360, 390, 768]) {
    const mobile = await pageFor({ width, height: 844 });
    await mobile.goto(url);
    await mobile.locator(".arena").waitFor();
    await noOverflow(mobile);
    await figuresFitArena(mobile);
    if (width === 390) await screenshot(mobile, "mobile-home");
  }
  const practice = await pageFor({ width: 390, height: 844 });
  await practice.goto(url);
  await practice.getByLabel("Your name", { exact: true }).fill("Solo");
  await practice.getByRole("button", { name: "Flying solo? Practise with bots" }).click();
  await practice.getByText("Your turn! Pick a fresh answer.", { exact: true }).waitFor();
  assert.equal(await practice.locator(".gardener").count(), 3);
  await practice.getByRole("button", { name: "Leave garden" }).click();
  await practice.getByRole("button", { name: "Host a garden" }).waitFor();
  await practice.getByRole("button", { name: "Host a garden" }).click();
  await practice.getByText("Gather your gang").waitFor();
  for (let i = 0; i < 7; i += 1)
    await practice.getByRole("button", { name: "+ Add a practice gardener" }).click();
  await waitFor(
    async () => (await practice.locator(".gardener").count()) === 8,
    "Eight gardeners should fit",
  );
  await noOverflow(practice);
  await figuresFitArena(practice);
  await screenshot(practice, "mobile-eight-players");
  const crowded = [...server.rooms.rooms.values()].find((item) =>
    item.players.some((player) => player.name === "Solo"),
  );
  await practice.getByRole("button", { name: "Let's get cooking!" }).click();
  await waitFor(() => crowded.phase === "answering", "Crowded room starts");
  for (const index of [0, 2, 4, 6]) {
    crowded.activeId = crowded.players[index].id;
    crowded.draft = "A wonderfully obscure answer";
    crowded.deadline = Date.now() + 12000;
    publish(crowded);
    await practice
      .locator(".speech-bubble output")
      .filter({ hasText: "A wonderfully obscure answer" })
      .waitFor();
    const bounds = await practice.locator(".speech-bubble").boundingBox();
    assert.ok(
      bounds.x >= 0 && bounds.x + bounds.width <= 390,
      `Bubble at seat ${index} fits the screen`,
    );
  }
  await screenshot(practice, "mobile-speech-bubble");
  await practice.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await practice
      .locator(".fire-sprite")
      .evaluate((element) => getComputedStyle(element).animationName),
    "none",
  );
  assert.deepEqual(failures, []);
  console.log(
    `Browser checks passed: rooms, answers, category changes, reconnect, heat stages, charring, live/private typing, refocus, winner, rematch, bots, exact approved64x96 portraits, pose sizes, seating bounds, rules, 320–1440px layout, reduced motion. Screenshots: ${output}`,
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await server.close();
}
