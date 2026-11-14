// Asker's input language in short, for an agent writing a definitions file: from Asker's docs
// (docs/inputs/ in teuton-software/asker, 2.10.0) and what its checker and generator do.

export const TOPICS = ["basics", "tables", "templates", "files", "problems", "code", "questions"] as const;
export type Topic = (typeof TOPICS)[number];

const BASICS = `# Asker input: basics

An input is a HAML file (\`.haml\`) or the same in XML (\`.xml\`). HAML counts spaces: 0 before %map, 2 before %concept, %problem and %code, 4 before their keywords, 6 before %row and %template, 8 or 10 before %col. No tabs.

\`\`\`haml
%map{ lang: 'en', context: 'furniture, home', version: '1'}

  %concept
    %names chair
    %tags single, seat, leg, backrest
    %def Single seat with legs and backrest
    %def Furniture that is placed around the table to sit

  %concept
    %names table
    %tags furniture, flat, top, leg, surface, work, eat
    %def Furniture with a flat top on legs, to work or eat at
\`\`\`

- **%map**, once, first line: \`lang\` (required) is the language of Asker's own words in the questions (en, es, fr, ca, du); \`context\` comma-separated labels for what the file is about; \`version: '1'\`.
- **%concept**: one thing to learn. **%names**: comma-separated names it really goes by (synonyms, a singular and a plural, another language's name), never a description; the first names its questions. **%tags**: comma-separated words that characterize it (Asker relates concepts by them; the checker asks for them).
- **%def**: a definition that fits this concept only, never another in the folder. Several are allowed, and each gives more questions. Don't write the concept's name inside it: Asker asks which concept a definition is, and hides or misspells words in it.
- Lines starting with \`//\` are comments. Accents go where the language needs them in what students see (names, definitions, tables); in tags and context, use them everywhere or nowhere: Asker compares words as they're written.
- Asker reads every .haml and .xml in the same folder, and takes wrong answers from the other concepts there: a file with one concept gives few questions; several related concepts in a context give many. A concept with nothing but names gives no questions. Anything else in the folder ending in .xml (a Moodle XML, say) stops Asker.
- The same in XML: \`<map lang='en' context='furniture, home' version='1'><concept><names>chair</names><tags>single, seat</tags><def>Single seat…</def></concept></map>\`.`;

const TABLES = `# Asker input: tables

A %def must fit one concept only; a table holds facts that may be shared. Fields are comma-separated, with no space between \`fields:\` and its value, nor between \`%table\` and \`{\`.

One field: a list (Asker asks which items belong to the concept, and hides or misspells them).
\`\`\`haml
  %concept
    %names AC/DC, ACDC
    %tags rock, band, australia
    %def Australian rock band formed by Scottish-born brothers Malcolm and Angus Young
    %table{ fields: 'members'}
      %row Bon Scott
      %row Angus Young
      %row Malcolm Young
\`\`\`

Several fields: each %row holds one %col per field, in order (a row with fewer or more cols stops Asker). Asker asks to match and to relate rows and columns.
\`\`\`haml
    %table{ fields: 'attribute, value'}
      %row
        %col Genres
        %col Hard rock, blues rock
      %row
        %col Formed in
        %col Sydney
\`\`\`

A sequence: a one-field table whose rows go in order, with \`sequence\` saying what the order is. Asker asks to put them in order.
\`\`\`haml
    %table{ fields: 'Albums', sequence: 'Albums sorted by date'}
      %row High Voltage
      %row Powerage
      %row Highway to Hell
\`\`\``;

const TEMPLATES = `# Asker input: templates

Inside a %table, a %template repeats its rows once per value: each variable is replaced by each of its comma-separated values.
\`\`\`haml
    %table{ fields: 'action, description' }
      %template{ DIRNAME: 'Endor,Naboo,Dagobah' }
        %row
          %col mkdir DIRNAME
          %col Create DIRNAME directory
\`\`\`
That is the same as three rows (mkdir Endor / Create Endor directory…). A variable's name must not appear elsewhere in the rows by chance.`;

const FILES = `# Asker input: files

A %def can be a file instead of text: \`%def{ type: 'file'} PATH\`, with a path relative to the input's folder, or a web address. Images (.png, .jpg, .jpeg), audio (.mp3, .ogg, .wav), video (.mp4, .ogv) and plain text. Asker asks which concept the file is about. A local file is embedded in the Moodle XML; a web address stays a link, loaded from the web when the question is shown.
\`\`\`haml
  %concept
    %names John Lennon
    %tags famous, singer, member, beatles
    %def{ type: 'file'} txt/quote.txt
    %def{ type: 'file'} images/john-lennon.png
\`\`\`
A missing local file stops Asker. This server never lets Asker look images up on the internet.`;

const PROBLEMS = `# Asker input: problems

A problem is a situation with questions whose answers can be checked. Asker writes many closed questions from it (true or false, choose, type the answer, find the wrong step, put steps in order).
\`\`\`haml
  %problem
    %cases{ varnames: 'N1, N2'}
      %case 3, 2
      %case 7, 3
      %case 13, 11
      %case 4, 4
    %desc We are going to perform calculations with integers.
    %ask
      %text Calculate the sum N1 + N2
      %answer{type: 'formula'} N1 + N2
    %ask
      %text Calculate the subtraction N1 - N2
      %answer{type: 'formula'} N1 - N2

  %problem
    %cases{ varnames: 'X'}
      %case x
      %case y
      %case z
      %case t
    %desc First degree equations
    %ask
      %text Solve the equation 2X - 4 = 6
      %step 2X - 4 = 6
      %step 2X = 10
      %step X = 5
\`\`\`
- **%desc**: the statement. **%ask**: a question, with **%text** and either an **%answer** or the **%step**s to the answer (or both).
- **%cases** with \`varnames\`: each **%case** gives every variable a value, in order, making the problem again with other data (4 or more cases are best). A variable's name must not be inside another's (N and NUM can't both be). \`sep: ';'\` changes the separator.
- \`%answer{type: 'formula'}\` computes the answer from the variables.
- Asker names a problem from its statement; its questions go under that name.`;

const CODE = `# Asker input: code (experimental in Asker)

%code points to a program file; Asker makes questions about it (find the line with an error, say whether a line is right), by changing the code.
\`\`\`haml
%map{ version: '1', lang: 'en', context: 'python, programming' }

  %code
    %type python
    %path files/string.py
\`\`\`
- **%type**: python, ruby, javascript or sql. **%path**: relative to the input's folder.
- No %tags or %def in a %code: they mean nothing there, Asker skips them and asker check flags them.
- Experimental in Asker: it may change or go, so keep code files few and simple.
- Its questions go under the file's name. Short programs with real, readable lines work best.`;

const QUESTIONS = `# What Asker makes

A question's name says where it comes from and its template: "router-12-t5table-$attribute$value" is router's twelfth question, template t5table, from the table with fields attribute and value. read_questions gives each question's template; generate_questions' \`exclude\` leaves out every question whose name contains a text ("misspelled", "d3hidden"), and \`stages\` picks the concept types by their letter.

**Definitions** (d, from %def):
- d1choose: which concept a definition is about (multiple choice); d1none, d1none-misspelled: the same, with "none" the right option.
- d2true, d2false: "the definition of X is …", true or false; d2true-misspelled, d2false-misspelled, d2def-misspelled, d2name-misspelled: the same with Misspelling as a third option, and a word of the definition or the name misspelled.
- d3hidden: write the concept's name, with its letters hidden (short answer).
- d4filtered: put the words taken out of a definition back (matching).

**One-field tables** (f, a %table with one field):
- f1true, f1false: does an item belong to the concept (true or false); f1short: write the missing item (short answer).
- f1name-misspelled, f1true-misspelled: the same with a misspelled item; f2outsider: which item doesn't belong; f3filtered: matching.

**Table matching** (b, a %table with several fields): b1match4x4, b1match4x5 (one extra answer) and their _misspelled and _error variants: match each value with its column; b1ddmatch…: the same as drag and drop (left out unless asked for).

**Table rows** (t, a %table with several fields): t1table to t4table: choose the value that goes with another in a row; t5table to t7table: true or false about a row's values; t8table, t9table: write the value.

**Sequences** (s, a %table with sequence): s1sequence, s2sequence: put the rows in order (ordering, or matching each with its position).

**Files** (i, a %def with type file): i1choice, i1misspelling, i1none: which concept a file is about; i2true, i2false: true or false; i3short: write the concept's name; i4filtered: matching.

**Problems**, by their %answer: 01pa1true, 02pa1false (true or false), 03pa2-choice-none, 04pa2choice, 05pa2choice (choose), 06pa2short (write the answer); by their %step: 07ps3short-ok (find the wrong step, or 0), 08ps6ordering (order the steps), 09ps7short-hide (write a hidden step), 10ps3short-error (the wrong step's number), 11ps5match, 12ps5ddmatch (each step with its position).

**Code** (%code): code1ok, code1comment, code1uncomment, code1syntaxerror, code1variable, code1keyword: the program with one change (or none): which line has the first error, written or chosen, or 0 when there's none.

Asker also puts, at random, a concept's image into the text of some of its questions, as a distractor: only a question that says so is about the image.

Moodle types: truefalse, multichoice, shortanswer, matching, ordering (standard from Moodle 4.4), and ddmatch (drag-and-drop matching, a plugin; left out unless asked for). Asker writes them in the language of the %map, with its own wording: the person reviews them before any import.`;

const TEXTS: Record<Topic, string> = { basics: BASICS, tables: TABLES, templates: TEMPLATES, files: FILES, problems: PROBLEMS, code: CODE, questions: QUESTIONS };

/** The reference for some topics, or all. */
export function reference(topics?: Topic[]): string {
  return (topics?.length ? topics : TOPICS).map((topic) => TEXTS[topic]).join("\n\n");
}
