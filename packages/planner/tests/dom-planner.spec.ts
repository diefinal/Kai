import { describe, it, expect, beforeEach } from 'vitest';
import { Planner } from '../src/Planner';

describe('Planner DOM Intelligence Planning', () => {
  let planner: Planner;

  beforeEach(() => {
    planner = new Planner();
  });

  it('recognizes "Bu sayfada kaç buton var?" as GET_BUTTONS plan', () => {
    const plan = planner.plan('Bu sayfada kaç buton var?');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('GET_BUTTONS');
  });

  it('recognizes "Giriş formunu bul." as QUERY_DOM plan', () => {
    const plan = planner.plan('Giriş formunu bul.');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('QUERY_DOM');
    expect(plan.steps[0].parameters.role).toBe('form');
  });

  it('recognizes "Email alanını bul." as QUERY_DOM plan', () => {
    const plan = planner.plan('Email alanını bul.');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('QUERY_DOM');
    expect(plan.steps[0].parameters.tag).toBe('input');
    expect(plan.steps[0].parameters.placeholder).toBe('email');
  });

  it('recognizes "Şifre kutusunu bul." as QUERY_DOM plan', () => {
    const plan = planner.plan('Şifre kutusunu bul.');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('QUERY_DOM');
    expect(plan.steps[0].parameters.tag).toBe('input');
    expect(plan.steps[0].parameters.type).toBe('password');
  });

  it('recognizes "Login butonunu bul." as QUERY_DOM plan', () => {
    const plan = planner.plan('Login butonunu bul.');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('QUERY_DOM');
    expect(plan.steps[0].parameters.role).toBe('button');
    expect(plan.steps[0].parameters.text).toBe('Login');
  });

  it('recognizes "Bu sayfada form var mı?" as GET_FORMS plan', () => {
    const plan = planner.plan('Bu sayfada form var mı?');
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].action).toBe('GET_FORMS');
  });

  it('recognizes English queries: "Find button Login" and "Find email input"', () => {
    const planBtn = planner.plan('Find button Login');
    expect(planBtn.steps[0].action).toBe('QUERY_DOM');
    expect(planBtn.steps[0].parameters.role).toBe('button');
    expect(planBtn.steps[0].parameters.text).toBe('Login');

    const planEmail = planner.plan('Find email input');
    expect(planEmail.steps[0].action).toBe('QUERY_DOM');
    expect(planEmail.steps[0].parameters.tag).toBe('input');
    expect(planEmail.steps[0].parameters.placeholder).toBe('email');
  });

  it('recognizes "Sayfayı oku" and "Read DOM" as READ_DOM plan', () => {
    const planTr = planner.plan('Sayfayı oku');
    expect(planTr.steps[0].action).toBe('READ_DOM');

    const planEn = planner.plan('Read DOM');
    expect(planEn.steps[0].action).toBe('READ_DOM');
  });
});
