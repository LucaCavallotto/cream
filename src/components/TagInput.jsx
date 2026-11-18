import { useRef, useState } from 'react';
import { normalizeTags } from '../../assets/js/transactions.js';

export default function TagInput({
  id,
  value,
  onChange,
  tags,
  disabled = false,
}) {
  const input = useRef(null);
  const [cursor, setCursor] = useState(value.length),
    [focused, setFocused] = useState(false);
  const fragment = value.slice(0, cursor).split(/[\s,]/).at(-1) || '';
  const matches =
    focused && fragment && fragment !== '#'
      ? tags
          .filter(
            (tag) =>
              tag
                .replace(/^#/, '')
                .toLowerCase()
                .startsWith(fragment.replace(/^#/, '').toLowerCase()) &&
              !value.toLowerCase().includes(tag.toLowerCase()),
          )
          .slice(0, 5)
      : [];
  function select(tag) {
    let start = cursor,
      end = cursor;
    while (start > 0 && !/[\s,]/.test(value[start - 1])) start--;
    while (end < value.length && !/[\s,]/.test(value[end])) end++;
    const next =
      normalizeTags(value.slice(0, start) + tag + ' ' + value.slice(end)) + ' ';
    onChange(next);
    setCursor(next.length);
    input.current.focus();
  }
  return (
    <>
      <input
        ref={input}
        id={id}
        className="form-control"
        placeholder={
          id === 'bulkTagsInput'
            ? 'e.g. #holiday #monthly'
            : 'Space separated, e.g. #holiday #mountain'
        }
        autoComplete="off"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart);
        }}
        onSelect={(e) => setCursor(e.target.selectionStart)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div
        id={
          id === 'bulkTagsInput' ? 'bulkTagsSuggestionBox' : 'tagsSuggestionBox'
        }
        className={`list-group position-absolute w-100 shadow-sm ${matches.length ? '' : 'd-none'}`}
        style={{ zIndex: 1050, top: '100%' }}
      >
        {matches.map((tag) => (
          <button
            key={tag}
            type="button"
            className="list-group-item list-group-item-action py-2 small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </>
  );
}
