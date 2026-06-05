import Types "../types/common";

module {
  public func get(settings : Types.Settings) : Types.SettingsSnapshot {
    {
      startWeekOnMonday = settings.startWeekOnMonday;
      workingHoursStart = settings.workingHoursStart;
      workingHoursEnd = settings.workingHoursEnd;
    };
  };

  public func update(
    settings : Types.Settings,
    input : Types.UpdateSettingsInput,
  ) {
    settings.startWeekOnMonday := input.startWeekOnMonday;
    settings.workingHoursStart := input.workingHoursStart;
    settings.workingHoursEnd := input.workingHoursEnd;
  };
};
