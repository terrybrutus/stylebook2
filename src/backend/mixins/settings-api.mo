import Types "../types/common";
import SettingsLib "../lib/settings";

mixin (settings : Types.Settings) {
  // Get current settings
  public query func getSettings() : async Types.SettingsSnapshot {
    SettingsLib.get(settings);
  };

  // Update settings
  public func updateSettings(input : Types.UpdateSettingsInput) : async () {
    SettingsLib.update(settings, input);
  };
};
