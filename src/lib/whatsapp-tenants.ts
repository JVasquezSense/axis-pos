export interface TenantConfig {
  twilioSid: string;
  twilioToken: string;
  twilioWhatsappNumber: string;
  glmApiKey: string;
  glmModel: string;
  glmBaseUrl: string;
  enabled: boolean;
  greeting: string;
  restaurantName: string;
  menu: string;
  paymentInfo: string;
}

export const tenantConfigs = new Map<string, TenantConfig>();
