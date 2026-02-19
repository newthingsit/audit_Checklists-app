module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      [
        '@babel/preset-react',
        {
          runtime: 'automatic', // Use modern JSX transform (React 17+)
        },
      ],
    ],
  };
};

