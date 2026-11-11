/**
 * The filter bar on the writing index.
 *
 * Three filters, combined: a topic (one at a time), a set of tags (any number)
 * and a search over the title and the summary. All three are ANDed, so the
 * reader narrows from a subject down to a post.
 *
 * The bar is hidden until this script runs, so a page without JavaScript
 * shows every post and no controls that do nothing. The state lives in the
 * query string, so a filtered view can be linked to and survives a reload.
 *
 * No framework: the index is a static page and the filter is a filter.
 */
(function () {
  var bar = document.querySelector('[data-filters]');
  var grid = document.querySelector('[data-grid]');
  if (!bar || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-card]'));
  if (!cards.length) return;

  var search = bar.querySelector('[data-search]');
  var topicButtons = Array.prototype.slice.call(bar.querySelectorAll('[data-topic]'));
  var tagButtons = Array.prototype.slice.call(bar.querySelectorAll('[data-tag]'));
  var count = document.querySelector('[data-count]');
  var empty = document.querySelector('[data-empty]');
  var total = cards.length;

  var state = { topic: '', tags: [], q: '' };

  /* ----- State in the query string --------------------------------------- */

  function readState() {
    var params = new URLSearchParams(window.location.search);
    state.topic = params.get('topic') || '';
    state.tags = (params.get('tag') || '').split(',').filter(Boolean);
    state.q = params.get('q') || '';
  }

  function writeState() {
    var params = new URLSearchParams();
    if (state.topic) params.set('topic', state.topic);
    if (state.tags.length) params.set('tag', state.tags.join(','));
    if (state.q) params.set('q', state.q);
    var query = params.toString();
    var url = window.location.pathname + (query ? '?' + query : '');
    window.history.replaceState(null, '', url);
  }

  /* ----- Matching -------------------------------------------------------- */

  function matches(card) {
    if (state.topic && card.dataset.topic !== state.topic) return false;
    if (state.tags.length) {
      var tags = (card.dataset.tags || '').split(',');
      for (var i = 0; i < state.tags.length; i++) {
        if (tags.indexOf(state.tags[i]) === -1) return false;
      }
    }
    if (state.q) {
      var needle = state.q.toLowerCase();
      if ((card.dataset.text || '').indexOf(needle) === -1) return false;
    }
    return true;
  }

  function apply() {
    var shown = 0;
    cards.forEach(function (card) {
      var hit = matches(card);
      card.hidden = !hit;
      if (hit) shown++;
    });

    if (count) {
      count.textContent =
        shown === total ? total + ' posts' : shown + ' of ' + total + ' posts';
    }
    if (empty) empty.hidden = shown !== 0;

    // A tag that no post in the current topic carries cannot be chosen. It is
    // hidden rather than disabled: a disabled chip still takes the space and
    // still reads as an option.
    tagButtons.forEach(function (button) {
      var tag = button.dataset.tag;
      var available = state.topic
        ? cards.some(function (card) {
            return (
              card.dataset.topic === state.topic &&
              (card.dataset.tags || '').split(',').indexOf(tag) !== -1
            );
          })
        : true;
      button.hidden = !available;
      button.classList.toggle('is-empty', !available);
    });
  }

  /* ----- Controls -------------------------------------------------------- */

  function setTopic(topic) {
    state.topic = state.topic === topic ? '' : topic;
    topicButtons.forEach(function (button) {
      var on = button.dataset.topic === state.topic;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    writeState();
    apply();
  }

  topicButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setTopic(button.dataset.topic || '');
    });
  });

  tagButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var tag = button.dataset.tag;
      var at = state.tags.indexOf(tag);
      if (at === -1) state.tags.push(tag);
      else state.tags.splice(at, 1);
      button.classList.toggle('is-on', at === -1);
      button.setAttribute('aria-pressed', at === -1 ? 'true' : 'false');
      writeState();
      apply();
    });
  });

  if (search) {
    var timer = null;
    search.addEventListener('input', function () {
      // A keystroke does not filter yet: the first one would hide half the
      // grid before the word was finished.
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        state.q = search.value.trim();
        writeState();
        apply();
      }, 140);
    });
  }

  /* ----- Start ------------------------------------------------------------ */

  readState();

  topicButtons.forEach(function (button) {
    var on = button.dataset.topic === state.topic;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  tagButtons.forEach(function (button) {
    var on = state.tags.indexOf(button.dataset.tag) !== -1;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (search && state.q) search.value = state.q;

  apply();
})();
