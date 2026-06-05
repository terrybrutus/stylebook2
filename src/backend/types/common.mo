
module {
  // Shared primitive aliases
  public type Id = Text;
  public type HHmm = Text; // "HH:MM" 24-hour time string
  public type ISODate = Text; // "YYYY-MM-DD"

  // Phase type discriminator
  public type PhaseType = {
    #active;
    #processing;
  };

  // A phase definition stored on a service
  public type PhaseDef = {
    phaseLabel : Text;
    durationMinutes : Nat;
    phaseType : PhaseType;
  };

  // A phase instance stored on an appointment (allows per-booking overrides)
  public type PhaseInstance = {
    phaseLabel : Text;
    durationMinutes : Nat;
    phaseType : PhaseType;
  };

  // Service entity
  public type Service = {
    id : Id;
    name : Text;
    price : Float;
    colorHex : Text;
    isMultiPhase : Bool;
    phases : [PhaseDef];
    finishingLabel : ?Text;
  };

  // Appointment entity
  public type Appointment = {
    id : Id;
    clientName : Text;
    serviceId : Id;
    date : ISODate;
    startTime : HHmm;
    durationMinutes : Nat;
    price : Float;
    phone : ?Text;
    notes : ?Text;
    phases : ?[PhaseInstance];
  };

  // Settings entity
  public type Settings = {
    var startWeekOnMonday : Bool;
    var workingHoursStart : HHmm;
    var workingHoursEnd : HHmm;
  };

  // Read-only settings snapshot for the API boundary
  public type SettingsSnapshot = {
    startWeekOnMonday : Bool;
    workingHoursStart : HHmm;
    workingHoursEnd : HHmm;
  };

  // Input types for create/update operations
  public type CreateAppointmentInput = {
    clientName : Text;
    serviceId : Id;
    date : ISODate;
    startTime : HHmm;
    durationMinutes : Nat;
    price : Float;
    phone : ?Text;
    notes : ?Text;
    phases : ?[PhaseInstance];
  };

  public type UpdateAppointmentInput = {
    id : Id;
    clientName : Text;
    serviceId : Id;
    date : ISODate;
    startTime : HHmm;
    durationMinutes : Nat;
    price : Float;
    phone : ?Text;
    notes : ?Text;
    phases : ?[PhaseInstance];
  };

  public type CreateServiceInput = {
    name : Text;
    price : Float;
    colorHex : Text;
    isMultiPhase : Bool;
    phases : [PhaseDef];
    finishingLabel : ?Text;
  };

  public type UpdateServiceInput = {
    id : Id;
    name : Text;
    price : Float;
    colorHex : Text;
    isMultiPhase : Bool;
    phases : [PhaseDef];
    finishingLabel : ?Text;
  };

  public type UpdateSettingsInput = {
    startWeekOnMonday : Bool;
    workingHoursStart : HHmm;
    workingHoursEnd : HHmm;
  };
};
