module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "globals": {
        "describe": true,
        "it": true,
        "require": true,
        "expect": true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": [
          "warn"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    },
    "plugins": [
      "html"
    ]
};
