---
description: Check that Ruby and Asker are installed, and say how to install what's missing
---

Call `check_requirements`. Only reads; installs nothing.

- If `ok`, say which Ruby and Asker versions were found, in one line, and that Asker is ready.
- If not, for each missing or old requirement give the person its `problem` and the exact `install` command for their system, in order (Ruby first, then Asker), and say: run them in a terminal, then restart this app if Ruby was just installed, and run this command again. Mention that `gem install` may end with an error about `rdoc` or `rbs` after installing the gem: `--no-document` avoids it.

Never run the install commands yourself.
