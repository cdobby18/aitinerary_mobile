const appJson = require('./app.json');

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return {
    ...appJson.expo,
    ...config,
    ios: {
      ...(appJson.expo.ios || {}),
      ...(config?.ios || {}),
      config: {
        ...((appJson.expo.ios || {}).config || {}),
        ...((config?.ios || {}).config || {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...(appJson.expo.android || {}),
      ...(config?.android || {}),
      config: {
        ...((appJson.expo.android || {}).config || {}),
        ...((config?.android || {}).config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};