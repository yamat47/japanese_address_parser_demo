# Japanese Address Parser Demo
This is the demonstration page for [yamat47/japanese_address_parser](https://github.com/yamat47/japanese_address_parser).

The page is published at [HERE](https://yamat47.github.io/japanese_address_parser_demo/).

## How it works
The page is a static site. It runs the gem itself in your browser with [ruby.wasm](https://github.com/ruby/ruby.wasm), so there is no application server.

- `build.rb` collects the Ruby sources of the gem installed by Bundler into `site/gems.json`.
- `site/demo.rb` loads those sources into ruby.wasm and replaces the gem's HTTP layer with the browser's `fetch`.
- `site/app.js` boots ruby.wasm, calls the gem and renders the result.

## Development
Everything runs in Docker; only Docker itself needs to be installed.

```sh
make serve          # build site/gems.json and serve the page at http://localhost:8000/
make build          # build site/gems.json only
make bundle-update  # update Gemfile.lock to the latest gems
make lint           # lint the GitHub Actions workflows
```

The page is built and released to GitHub Pages by GitHub Actions when `main` branch is updated.
The actions and the agent skills under `.claude/skills/` come from [yamat47/github-toolkit](https://github.com/yamat47/github-toolkit).
