(() => {
  'use strict';

  const panel = document.getElementById('workout-timer');
  const title = panel.querySelector('.timer-context strong');
  const subtitle = panel.querySelector('.timer-context span');
  const label = panel.querySelector('.timer-phase');
  const seconds = panel.querySelector('.timer-seconds');
  const toggle = panel.querySelector('[data-action="toggle"]');
  const skip = panel.querySelector('[data-action="skip"]');
  const reset = panel.querySelector('[data-action="reset"]');

  const schedule = [];
  for (const card of document.querySelectorAll('main article')) {
    const heading = card.querySelector('h3').cloneNode(true);
    heading.querySelector('.equipment').remove();
    const name = heading.textContent.trim();
    const sides = card.dataset.sideOne ? [card.dataset.sideOne, card.dataset.sideTwo] : [''];

    for (const side of sides) {
      schedule.push({ phase: 'work', duration: 60_000, card, name, side });
      schedule.push({ phase: 'rest', duration: 20_000 });
    }
    if (card.dataset.extraRest) {
      schedule.push({ phase: 'transition', duration: Number(card.dataset.extraRest) * 1000 });
    }
  }

  let index = 0;
  let remaining = schedule[0].duration;
  let deadline = 0;
  let ticker;
  let status = 'ready';
  let currentCard;

  function render() {
    const step = schedule[index];
    const nextWork = schedule.slice(index + 1).find(item => item.phase === 'work');
    const isWork = step?.phase === 'work';
    const shown = isWork ? step : nextWork;
    const phaseName = isWork ? 'Работа' : step?.phase === 'transition' ? 'К коврику' : 'Отдых';
    const name = isWork ? step.name : nextWork ? 'Дальше · ' + nextWork.name :
      step ? 'Последний отдых' : 'Тренировка завершена';
    const side = shown?.side ?? '';

    if (title.textContent !== name) title.textContent = name;
    if (subtitle.textContent !== side) subtitle.textContent = side;
    if (currentCard !== shown?.card) {
      currentCard?.removeAttribute('aria-current');
      currentCard = shown?.card;
      currentCard?.setAttribute('aria-current', 'step');
      if (status === 'running') currentCard?.scrollIntoView({ block: 'start' });
    }
    panel.dataset.phase = isWork || !step ? 'work' : 'rest';
    label.textContent = !step ? 'Готово' : phaseName + (status === 'paused' ? ' · пауза' : '');
    seconds.textContent = String(Math.ceil(remaining / 1000));
    toggle.textContent = {
      ready: 'Старт', running: 'Пауза', paused: 'Продолжить', done: 'Заново',
    }[status];
    skip.disabled = status === 'ready' || status === 'done';
    skip.textContent = isWork ? 'К отдыху' : 'Пропустить';
    reset.disabled = status === 'ready';
  }

  function finish() {
    clearInterval(ticker);
    status = 'done';
    remaining = 0;
  }

  function tick() {
    if (status !== 'running') return;

    const now = Date.now();
    while (schedule[index] && now >= deadline) {
      index += 1;
      if (schedule[index]) deadline += schedule[index].duration;
    }

    if (schedule[index]) remaining = deadline - now;
    else finish();
    render();
  }

  function prepare() {
    clearInterval(ticker);
    index = 0;
    remaining = schedule[0].duration;
    status = 'ready';
    render();
  }

  toggle.addEventListener('click', () => {
    if (status === 'running') {
      tick();
      if (status === 'done') return;
      clearInterval(ticker);
      status = 'paused';
      render();
      return;
    }

    if (status === 'done') prepare();
    const starting = status === 'ready';
    status = 'running';
    deadline = Date.now() + remaining;
    ticker = setInterval(tick, 100);
    tick();
    if (starting) schedule[index]?.card.scrollIntoView({ block: 'start' });
  });

  skip.addEventListener('click', () => {
    if (status === 'ready' || status === 'done') return;
    if (status === 'running' && Date.now() >= deadline) {
      tick();
      return;
    }

    index += 1;
    if (schedule[index]) {
      remaining = schedule[index].duration;
      if (status === 'running') deadline = Date.now() + remaining;
    } else {
      finish();
    }
    render();
  });

  reset.addEventListener('click', prepare);
  document.addEventListener('visibilitychange', tick);
  prepare();
  panel.hidden = false;
})();
