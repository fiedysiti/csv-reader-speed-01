# csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/fiedysiti/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/fiedysiti/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, exact CSV reader for broken files. It implements the csv-reader 1.0.0 broken-row policy precisely — BOM dropped, LF/CRLF record ends, stray CRs reported and dropped, quoted fields with doubled quotes and CR/LF folded to LF, junk after a closing quote, unterminated quotes re-read as unquoted, short/long rows padded or cut to the first record's width — but parses with bulk scanning (one regex search plus one slice per field) instead of one character at a time, so it reads the same broken files much faster than the reference.

## Run it

```sh
node main.ts
```

It reads cases from `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`) and writes answers to `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`).

<sub>Entered on [make.fun](https://make.fun/?ref=3debkpg7&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
