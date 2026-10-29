import type { State, Command, Context, CellType } from "../domain/model";
import { Controller } from "../application/controller";
import type { Store } from "../application/controller";
import { RULES, difficulty, money, multiplier, outcome } from "../domain/rules";
import { questionById, validateBank } from "../domain/questions";
import bank from "../data/questions.json";
const labels: Record<CellType, string> = {
  SAFE: "An toàn",
  MINE: "Mìn",
  LIFE_GIFT: "Quà mạng",
  BONUS_GIFT: "Quà bonus",
};
const reasons = {
  BUSTED: "Hết mạng",
  CAP_REACHED: "Chạm trần thưởng",
  ALL_SAFE_OPENED: `Đã mở đủ ${RULES.safeTotal} ô an toàn`,
  CASHED_OUT: "Chủ động chốt thưởng",
};
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.textContent = text;
  el.className = className;
  return el;
}
export interface ViewOptions {
  store: Store;
  now: () => number;
  seed: () => number;
  roundId: () => string;
  boardFactory?: Context["boardFactory"];
  confirm: (message: string) => boolean;
  download: (raw: string) => void;
  notify?: () => void;
}
export function mount(
  root: HTMLElement,
  options: ViewOptions,
): { controller: Controller; destroy: () => void } {
  let soundEnabled = false;
  let modeFlag = false,
    disposed = false;
  const send = (command: Command) => {
    const before = controller.state.phase;
    controller.dispatch(command);
    if (
      soundEnabled &&
      before !== "FEEDBACK" &&
      controller.state.phase === "FEEDBACK"
    )
      options.notify?.();
  };
  const button = (
    text: string,
    action: () => void,
    disabled = false,
    className = "",
  ): HTMLButtonElement => {
    const b = node("button", text, className);
    b.type = "button";
    b.disabled = disabled;
    b.onclick = action;
    return b;
  };
  const controller = new Controller(
    options.store,
    () => ({ now: options.now(), boardFactory: options.boardFactory }),
    () => render(),
  );
  function render(): void {
    if (disposed) return;
    const previous = document.activeElement?.getAttribute("data-focus");
    const wasModal = Boolean(root.querySelector("[role=dialog]"));
    const previousScroll =
      root.querySelector<HTMLElement>(".question-modal")?.scrollTop ?? 0;
    root.replaceChildren();
    const s = controller.state;
    const header = node("header");
    header.append(
      node("span", "VNR202 / HAI MIỀN 1954–1965", "eyebrow"),
      node("h1", "VNR202 — Dò mìn tri thức"),
      node("p", "Một lựa chọn. Một câu hỏi. Chinh phục 150.000đ.", "subtitle"),
    );
    root.append(header);
    if (controller.error) {
      root.classList.remove("has-modal");
      document.body.classList.remove("modal-open");
      const warning = node("section", "", "warning");
      warning.setAttribute("role", "alert");
      warning.append(
        node(
          "h2",
          controller.migrationPending
            ? "Đã cập nhật VNR202"
            : "Vòng chơi đang khóa",
        ),
        node("p", controller.error),
        button("Tải bản sao dữ liệu", () =>
          options.download(controller.raw ?? ""),
        ),
      );
      if (controller.candidate)
        warning.append(button("Thử lưu lại", () => controller.retry()));
      warning.append(
        button(
          controller.migrationPending ? "Bắt đầu VNR202" : "Phục hồi buổi mới",
          () => {
            if (
              options.confirm(
                controller.migrationPending
                  ? "Bắt đầu VNR202 mới và xóa đúng dữ liệu trò chơi cũ? Dữ liệu ứng dụng khác được giữ nguyên."
                  : "Bắt đầu vòng mới từ dữ liệu phục hồi? Chỉ giữ kết quả VNR202 đã chốt đọc được; vòng dở và lịch sử câu cũ sẽ không được tiếp tục.",
              )
            )
              controller.recover();
          },
        ),
      );
      root.append(warning);
      return;
    }
    root.append(hud(s));
    const isModal = [
      "PREPARING",
      "QUESTION_ACTIVE",
      "PAUSED",
      "FEEDBACK",
    ].includes(s.phase);
    root.classList.toggle("has-modal", isModal);
    document.body.classList.toggle("modal-open", isModal);
    {
      const layout = node("main", "", "layout");
      const sidebar = node("aside", "", "sidebar");
      sidebar.append(node("span", "MỘT NGƯỜI CHƠI", "sidebar-mode"));
      const counts = node("div", "", "board-counts");
      for (const [label, value] of [
        ["Mìn", String(RULES.mineCount)],
        ["Ô an toàn còn lại", String(RULES.safeTotal - s.safeOpened)],
        ["Mạng hiện tại", `${s.lives} / 3`],
        ["Lượt đã chơi", String(s.used.length)],
      ]) {
        const item = node("div", "", "board-stat");
        item.append(node("span", label), node("strong", value));
        counts.append(item);
      }
      if (s.phase !== "SETUP")
        sidebar.append(
          counts,
          node("p", "♥ 2 quà mạng · ✦ 3 quà bonus", "board-note"),
        );
      if (s.phase === "SETUP") sidebar.append(setup());
      else if (!isModal) sidebar.append(panel(s));
      else
        sidebar.append(
          node(
            "p",
            s.phase === "FEEDBACK"
              ? "Xem kết quả trước khi tiếp tục."
              : "Hoàn thành câu hỏi để chốt thưởng",
            "sidebar-status",
          ),
        );
      layout.append(sidebar, board(s));
      layout.inert = isModal;
      root.append(layout);
      if (isModal) {
        const overlay = node("div", "", "modal-backdrop");
        const dialog = panel(s);
        dialog.classList.add("question-modal");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "question-title");
        dialog.querySelector("[data-panel-title]")!.id = "question-title";
        dialog.onkeydown = (event) => {
          if (event.key === "Escape") event.preventDefault();
          if (event.key !== "Tab") return;
          const radios = [
            ...dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
          ];
          const entryRadio = radios.find((radio) => radio.checked) ?? radios[0];
          const controls = [
            ...dialog.querySelectorAll<HTMLElement>("*"),
          ].filter(
            (el) =>
              (el.tagName === "BUTTON" || el.tagName === "INPUT") &&
              !el.matches(":disabled") &&
              !el.closest("fieldset:disabled") &&
              (!(el instanceof HTMLInputElement) ||
                el.type !== "radio" ||
                el === entryRadio),
          );
          const first = controls[0],
            last = controls.at(-1);
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              !controls.includes(document.activeElement as HTMLElement))
          ) {
            event.preventDefault();
            last?.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              !controls.includes(document.activeElement as HTMLElement))
          ) {
            event.preventDefault();
            first?.focus();
          }
        };
        overlay.append(dialog);
        root.append(overlay);
        if (wasModal && ["QUESTION_ACTIVE", "PAUSED"].includes(s.phase))
          dialog.scrollTop = previousScroll;
      }
    }
    const history = node("details", "", "history");
    history.append(
      node(
        "summary",
        `Lịch sử buổi · ${s.ledger.length} vòng · Tổng thưởng đã chốt: ${money(s.ledger.reduce((n, x) => n + x.cash, 0))}`,
      ),
    );
    for (const entry of [...s.ledger].reverse())
      history.append(
        node(
          "p",
          `${entry.name} · ${money(entry.cash)} · ${reasons[entry.reason]} · ${entry.turns} lượt`,
        ),
      );
    history.inert = isModal;
    root.append(history);
    const footer = node("footer");
    footer.append(
      node(
        "span",
        "Chỉ dùng một tab · Tự động lưu trên máy này · Thưởng do người tổ chức trao",
      ),
      button(
        "Xóa dữ liệu buổi",
        () => {
          if (
            options.confirm(
              "Xóa toàn bộ lịch sử câu hỏi và thưởng đã chốt của buổi?",
            )
          )
            controller.reset();
        },
        !["SETUP", "READY", "FINISHED"].includes(s.phase),
      ),
    );
    footer.append(
      button(soundEnabled ? "Âm thanh: bật" : "Âm thanh: tắt", () => {
        soundEnabled = !soundEnabled;
        render();
      }),
    );
    footer.inert = isModal;
    root.append(footer);
    updateClock();
    if (isModal && !wasModal)
      root
        .querySelector<HTMLElement>("[data-panel-title]")
        ?.focus({ preventScroll: true });
    else if (wasModal && !isModal && s.phase === "READY")
      root
        .querySelector<HTMLElement>(".cell:not(:disabled)")
        ?.focus({ preventScroll: true });
    else if (
      previous &&
      root.querySelector<HTMLElement>(`[data-focus="${previous}"]`)
    )
      root
        .querySelector<HTMLElement>(`[data-focus="${previous}"]`)!
        .focus({ preventScroll: true });
    else if (["PREPARING", "FEEDBACK", "FINISHED"].includes(s.phase))
      root
        .querySelector<HTMLElement>("[data-panel-title]")
        ?.focus({ preventScroll: true });
    else if (wasModal)
      root
        .querySelector<HTMLElement>(".cell:not(:disabled)")
        ?.focus({ preventScroll: true });
    if (s.phase === "PREPARING") send({ type: "ACTIVATE", turnId: s.turn!.id });
  }
  function hud(s: State): HTMLElement {
    const h = node("section", "", "hud");
    h.setAttribute("aria-label", "Thưởng hiện tại");
    const cash = node("div", "", "cash-block");
    cash.append(
      node("span", "THƯỞNG HIỆN TẠI", "eyebrow"),
      node("strong", money(s.cash), "cash"),
    );
    cash.lastElementChild!.setAttribute("data-testid", "cash");
    cash.lastElementChild!.setAttribute("aria-live", "polite");
    const stats = node("div", "", "stats");
    stats.append(
      node("strong", `Hệ số ${multiplier(s.cash)}`),
      node("span", `Trần ${money(RULES.cashCapVnd)}`),
      node("span", `Mạng: ${s.lives} / 3`),
      node(
        "span",
        s.bonus
          ? `✦ Bonus: +${money(RULES.boostedSafeGainVnd)} nếu an toàn đúng`
          : "Bonus: chưa có",
      ),
      node("span", `An toàn: ${s.safeOpened} / ${RULES.safeTotal}`),
      node("span", `Tầng ${s.turn?.difficulty ?? difficulty(s.cash)}`),
    );
    h.append(cash, stats);
    return h;
  }
  function nameForm(
    action: (name: string) => void,
    label: string,
  ): HTMLElement {
    const form = node("form");
    const l = node("label", "Tên người chơi (không bắt buộc)");
    const input = node("input");
    input.name = "name";
    input.maxLength = 80;
    input.placeholder = "Ví dụ: Minh Anh";
    l.append(input);
    const start = node("button", label, "primary");
    start.type = "submit";
    form.append(l, start);
    form.onsubmit = (e) => {
      e.preventDefault();
      action(input.value);
    };
    return form;
  }
  function start(name: string): void {
    modeFlag = false;
    send({
      type: "START",
      name,
      seed: options.seed(),
      roundId: options.roundId(),
    });
  }
  function setup(): HTMLElement {
    const section = node("section", "", "welcome");
    section.append(
      node("span", "HỌC CÙNG NHAU · CHƠI TỪNG LƯỢT", "eyebrow"),
      node("h2", "Kiến thức là bước đi an toàn."),
      node(
        "p",
        `25 ô bí mật. ${RULES.mineCount} mìn, ${RULES.lifeGiftCount} quà mạng, ${RULES.bonusGiftCount} quà bonus. Ô đầu luôn an toàn thường. An toàn đúng +${money(RULES.safeGainVnd)}, hoặc +${money(RULES.boostedSafeGainVnd)} nếu có bonus.`,
      ),
      node(
        "p",
        `Bắt đầu với ${money(RULES.startingCashVnd)} và ${RULES.startingLives} mạng. Sai ô an toàn giữ 88% thưởng; gặp mìn còn nửa thưởng. Sai mìn khi còn 1 mạng sẽ mất toàn bộ thưởng. Bonus chỉ dùng ở lượt kế tiếp.`,
      ),
      nameForm(start, "Bắt đầu vòng chơi"),
    );
    return section;
  }
  function board(s: State): HTMLElement {
    const section = node("section", "", "board-panel");
    const top = node("div", "", "section-top");
    top.append(
      node("h2", s.name || "Bàn dò mìn 5 × 5"),
      button(
        modeFlag ? "⚑ Đang cắm cờ" : "⚑ Chế độ cắm cờ",
        () => {
          modeFlag = !modeFlag;
          render();
        },
        s.phase !== "READY",
        modeFlag ? "selected" : "",
      ),
    );
    section.append(top);
    const grid = node("div", "", "board");
    grid.setAttribute("aria-label", "Bàn dò mìn 5 nhân 5");
    for (let i = 0; i < 25; i++) {
      const cell = s.board?.[i],
        open = cell?.opened,
        flag = s.flags.includes(i),
        active =
          s.turn?.cellId === i &&
          ["PREPARING", "QUESTION_ACTIVE", "PAUSED"].includes(s.phase);
      const mark = open
        ? cell.type === "MINE"
          ? "✹"
          : cell.type === "LIFE_GIFT"
            ? `♥ ${cell.adjacent}`
            : cell.type === "BONUS_GIFT"
              ? `✦ ${cell.adjacent}`
              : String(cell.adjacent)
        : flag
          ? "⚑"
          : active
            ? "?"
            : String(i + 1).padStart(2, "0");
      const b = button(
        mark,
        () => send({ type: modeFlag ? "FLAG" : "OPEN", cellId: i }),
        s.phase !== "READY" || Boolean(open),
        `cell ${open ? "opened " + cell.type.toLowerCase() : ""} ${active ? "active" : ""} ${flag ? "flagged" : ""}`,
      );
      if (open) {
        b.replaceChildren();
        if (cell.type !== "SAFE")
          b.append(
            node(
              "span",
              cell.type === "MINE"
                ? "✹"
                : cell.type === "LIFE_GIFT"
                  ? "♥"
                  : "✦",
              "tile-icon",
            ),
          );
        if (cell.type !== "MINE")
          b.append(node("span", String(cell.adjacent), "tile-count"));
      }
      b.dataset.cell = String(i);
      b.dataset.focus = `cell-${i}`;
      b.setAttribute(
        "aria-label",
        `Hàng ${Math.floor(i / 5) + 1} cột ${(i % 5) + 1}: ${open ? labels[cell.type] + `, ${cell.adjacent} mìn liền kề` : flag ? "cắm cờ" : active ? "đang trả lời" : "còn kín"}`,
      );
      b.oncontextmenu = (e) => {
        e.preventDefault();
        send({ type: "FLAG", cellId: i });
      };
      grid.append(b);
    }
    section.append(
      grid,
      node("p", "✹ Mìn 7   ·   ♥ Quà mạng 2   ·   ✦ Quà bonus 3", "legend"),
      node(
        "p",
        "Chuột phải hoặc chế độ cắm cờ để đánh dấu. Gỡ cờ trước khi mở.",
        "hint",
      ),
    );
    return section;
  }
  function title(text: string): HTMLElement {
    const h = node("h2", text);
    h.tabIndex = -1;
    h.dataset.panelTitle = "";
    h.dataset.focus = "panel-title";
    return h;
  }
  function panel(s: State): HTMLElement {
    const p = node("section", "", "question-panel");
    p.setAttribute("aria-label", "Lượt chơi");
    if (s.phase === "READY") {
      p.append(
        node("span", "SẴN SÀNG", "eyebrow"),
        title("Bạn chọn ô nào?"),
        node(
          "p",
          "Mỗi ô là một câu hỏi. Câu đúng tầng được chọn theo tiền trước lượt; bạn có thể thay lựa chọn trước khi xác nhận.",
        ),
        button(
          `Chốt ${money(s.cash)}`,
          () => {
            if (options.confirm(`Chốt thưởng ${money(s.cash)} cho ${s.name}?`))
              send({ type: "CASHOUT" });
          },
          s.used.length === 0,
          "primary",
        ),
        node(
          "p",
          s.used.length
            ? "Chốt thưởng sẽ kết thúc vòng này."
            : "Hoàn thành ít nhất một lượt để chốt thưởng.",
          "hint",
        ),
      );
      return p;
    }
    if (s.phase === "FINISHED") {
      p.append(
        node("span", "VÒNG CHƠI KẾT THÚC", "eyebrow"),
        title(reasons[s.terminal!]),
        node("strong", `Thưởng đã chốt: ${money(s.cash)}`, "settled"),
        node(
          "p",
          `${s.used.length} lượt · ${s.safeOpened}/${RULES.safeTotal} ô an toàn · ${s.name}`,
        ),
        nameForm(start, "Bắt đầu người chơi mới"),
      );
      return p;
    }
    const t = s.turn!,
      q = questionById(t.questionId),
      cell = s.board![t.cellId];
    p.dataset.questionId = q.id;
    const top = node("div", "", "section-top");
    top.append(
      node("span", `${labels[cell.type]} · Tầng ${t.difficulty}`, "eyebrow"),
    );
    if (!t.result) {
      const time = node("strong", "", "timer");
      time.dataset.timer = "";
      top.append(time);
    }
    p.append(top, title(q.prompt));
    if (t.result) {
      const r = t.result;
      p.append(
        node(
          "strong",
          r.reason === "timeout"
            ? "Hết giờ"
            : r.correct
              ? "Chính xác!"
              : "Chưa chính xác",
          "verdict",
        ),
        node(
          "p",
          `${r.delta >= 0 ? "+" : "−"}${money(Math.abs(r.delta))} · ${money(t.cashBefore)} → ${money(s.cash)}`,
          "delta",
        ),
        node(
          "p",
          `Đã chọn: ${t.selected ? q.options.find((o) => o.id === t.selected)!.text : "Chưa chọn"}`,
        ),
        node(
          "p",
          `Đáp án đúng: ${q.options.find((o) => o.id === q.correctOptionId)!.text}`,
          "answer",
        ),
        node("p", q.explanation),
        node("small", q.sourceRef),
        node(
          "p",
          r.gift ||
            (cell.type === "MINE"
              ? `Còn ${s.lives} mạng.`
              : "Không nhận quà ở lượt này."),
        ),
        button("Tiếp tục", () => send({ type: "CONTINUE" }), false, "primary"),
      );
      return p;
    }
    const form = node("form", "", "answers");
    const fieldset = node("fieldset");
    fieldset.disabled = s.phase === "PAUSED";
    const legend = node("legend", "Chọn một phương án");
    legend.className = "sr-only";
    fieldset.append(legend);
    t.optionOrder.forEach((id, i) => {
      const label = node(
        "label",
        "",
        "option" + (id === t.selected ? " selected" : ""),
      );
      const radio = node("input");
      radio.type = "radio";
      radio.name = "answer";
      radio.value = id;
      radio.checked = id === t.selected;
      radio.dataset.focus = `option-${id}`;
      radio.onchange = () =>
        send({ type: "SELECT", turnId: t.id, optionId: id });
      label.append(
        radio,
        node("span", String.fromCharCode(65 + i), "option-letter"),
        node("span", q.options.find((o) => o.id === id)!.text),
      );
      fieldset.append(label);
    });
    form.append(fieldset);
    const actions = node("div", "", "actions");
    const submit = node("button", "Xác nhận", "primary");
    submit.type = "submit";
    submit.disabled = !t.selected || s.phase !== "QUESTION_ACTIVE";
    submit.dataset.focus = "submit";
    actions.append(
      submit,
      button(
        s.phase === "PAUSED" ? "Tiếp tục đồng hồ" : "Tạm dừng",
        () =>
          send({
            type: s.phase === "PAUSED" ? "RESUME" : "PAUSE",
            turnId: t.id,
          }),
        s.phase === "PREPARING",
      ),
    );
    form.append(actions);
    form.onsubmit = (e) => {
      e.preventDefault();
      send({ type: "SUBMIT", turnId: t.id });
    };
    p.append(form);
    const forecast = outcome(
      cell.type,
      s.cash,
      s.lives,
      s.bonus,
      true,
      "answer",
    );
    p.append(
      node(
        "p",
        s.phase === "PAUSED"
          ? "Đã tạm dừng · lựa chọn và thời gian được giữ."
          : `Dự báo nếu đúng: ${money(forecast.cash)} (${forecast.delta >= 0 ? "+" : "−"}${money(Math.abs(forecast.delta))})`,
        "hint",
      ),
      node("p", "Hoàn thành câu hỏi để chốt thưởng", "hint"),
    );
    return p;
  }
  function updateClock(): void {
    const s = controller.state,
      t = s.turn;
    if (!t) return;
    const timer = root.querySelector<HTMLElement>("[data-timer]");
    if (timer)
      timer.textContent =
        s.phase === "PAUSED"
          ? `Dừng · ${Math.ceil(t.remaining / 1000)}s`
          : `${Math.max(0, Math.ceil(((t.deadline ?? options.now() + t.remaining) - options.now()) / 1000))}s`;
  }
  try {
    validateBank(bank);
  } catch {
    root.replaceChildren(
      node("p", "Lỗi ngân hàng câu hỏi. Không thể bắt đầu vòng chơi."),
    );
    return {
      controller,
      destroy: () => {
        disposed = true;
      },
    };
  }
  render();
  controller.restoreDeadline();
  const interval = setInterval(() => {
    controller.restoreDeadline();
    updateClock();
  }, 100);
  return {
    controller,
    destroy: () => {
      disposed = true;
      clearInterval(interval);
      document.body.classList.remove("modal-open");
      root.classList.remove("has-modal");
      root.replaceChildren();
    },
  };
}
