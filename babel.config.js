module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@features': './src/features',
            '@shared': './src/shared',
            '@store': './src/store',
            '@hooks': './src/hooks',
            '@api': './src/api',
            '@theme': './src/shared/theme',
          },
        },
      ],
    ],
  };
};
