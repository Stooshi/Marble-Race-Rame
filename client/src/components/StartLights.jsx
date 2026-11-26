import { START_LIGHTS, startLightsOn } from '../three/startGate';

/**
 * A Grand Prix start over the view: five red lights in a row, coming on one by
 * one over the last three seconds of the countdown and all going out at GO
 * (instead of 3, 2, 1). `t`: ms after GO (negative during the countdown).
 */
export default function StartLights({ t, className = '' }) {
  const on = startLightsOn(t);
  const label = t >= 0 ? 'Lights out, go!' : `${on} of ${START_LIGHTS} start lights on`;
  return (
    <div className={`start-lights${t >= 0 ? ' is-out' : ''} ${className}`} role="img" aria-label={label}>
      {Array.from({ length: START_LIGHTS }, (_, k) => (
        <span key={k} className={`start-lights__pod${k < on ? ' is-on' : ''}`}>
          <i />
          <i />
        </span>
      ))}
    </div>
  );
}
