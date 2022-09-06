{
  "name": "{{project_name}}",
  "version": "1.0.0",
  {{#if author_email}}
  "author": "{{author_name}} <{{author_email}}>",
  {{else}}
  "author": "{{author_name}}",
  {{/if}}
  "license": "MIT",
  "scripts": {
    "run-node": "swanky node start",
    "compile": "swanky compile",
    "deploy": "swanky deploy"
  },
  "dependencies": {
    "@astar-network/swanky-cli": "{{swanky_version}}"
  }
}