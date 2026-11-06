import { createContext, useContext } from 'react';

// Desenli arka plan yalnız ana sekme ekranlarında (ve alt sayfalarında). Odak modu, giriş ve onboarding sade kalır.
const BackgroundScopeContext = createContext(false);
export const BackgroundScope = ({ children }) => (
  <BackgroundScopeContext.Provider value>{children}</BackgroundScopeContext.Provider>
);
export const useInBackgroundScope = () => useContext(BackgroundScopeContext);
