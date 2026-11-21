// csv-reader-speed-01: a fast, original CSV reader for broken files.
//
// It answers exactly what csv-reader 1.0.0 (make.fun's reference program)
// answers for every input: {columns, rows, errors} under the same broken-row
// policy (BOM dropped, LF/CRLF record ends, stray CR dropped with an error,
// quoted fields with doubled quotes and CR/LF folded to LF, junk after a
// closing quote, unterminated quotes re-read as unquoted, short/long rows
// padded or cut to the first record's width, errors in encounter order).
//
// Speed comes from bulk scanning instead of one character at a time: each
// field is found with one regex search for its next terminator and taken
// with a single slice, so a field costs one search plus one substring
// instead of one concatenation per character. No dependencies.

/** Unquoted-field terminators: comma, CR, LF. */
const FIELD_END = /[,\r\n]/g;
/** Characters that matter inside a quoted field: quote, CR, LF. */
const QUOTED_END = /["\r\n]/g;

const END_COMMA = 0;
const END_BREAK = 1;
const END_EOF = 2;

/** csv-reader 1.0.0's answer for one case's input, {text, header}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const len = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (len > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters onto `value` up to the next comma or line break: a CR not followed by LF is dropped
  // (stray_cr). Returns the field and how it ended; `added` counts the characters kept.
  function readUnquoted(value) {
    let added = 0;
    for (;;) {
      FIELD_END.lastIndex = pos;
      const m = FIELD_END.exec(text);
      if (m === null) {
        if (pos < len) {
          added += len - pos;
          value += text.slice(pos, len);
          pos = len;
        }
        return { value, ended: END_EOF, added };
      }
      const i = m.index;
      const c = text.charCodeAt(i);
      if (c === 44) {
        // ',': the record goes on.
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 1;
        return { value, ended: END_COMMA, added };
      }
      if (c === 10) {
        // LF: the record ends.
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 1;
        line += 1;
        return { value, ended: END_BREAK, added };
      }
      // CR.
      if (i + 1 < len && text.charCodeAt(i + 1) === 10) {
        // CRLF: the record ends.
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 2;
        line += 1;
        return { value, ended: END_BREAK, added };
      }
      // A CR not followed by LF is dropped (stray_cr); keep scanning.
      if (i > pos) {
        added += i - pos;
        value += text.slice(pos, i);
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos = i + 1;
    }
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    const parts = [];
    pos += 1;
    for (;;) {
      QUOTED_END.lastIndex = pos;
      const m = QUOTED_END.exec(text);
      if (m === null) {
        // The quote never closes: it is a literal character, and the text after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        return readUnquoted('"');
      }
      const i = m.index;
      const c = text.charCodeAt(i);
      if (c === 34) {
        // '"'.
        if (i + 1 < len && text.charCodeAt(i + 1) === 34) {
          // Doubled: one quote.
          if (i > pos) parts.push(text.slice(pos, i));
          parts.push('"');
          pos = i + 2;
          continue;
        }
        // Closing quote.
        if (i > pos) parts.push(text.slice(pos, i));
        pos = i + 1;
        const value = parts.join('');
        if (pos >= len) return { value, ended: END_EOF };
        const n = text.charCodeAt(pos);
        if (n === 44) {
          pos += 1;
          return { value, ended: END_COMMA };
        }
        if (n === 10) {
          pos += 1;
          line += 1;
          return { value, ended: END_BREAK };
        }
        if (n === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          return { value, ended: END_BREAK };
        }
        // What follows the closing quote is appended as it stands, up to the next comma or line break.
        const junk = readUnquoted(value);
        if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        return junk;
      }
      // CR or LF inside quotes: each is one LF.
      if (i > pos) parts.push(text.slice(pos, i));
      parts.push('\n');
      line += 1;
      pos = c === 13 && i + 1 < len && text.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === END_COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
