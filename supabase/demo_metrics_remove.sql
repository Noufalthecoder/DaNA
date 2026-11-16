-- Removes everything demo_metrics_seed.sql added (all ids start with 'demo_m').
delete from comprehension_checks where person_id like 'demo_m%';
delete from appointments where couple_id like 'demo_mc%';
delete from case_assignments where case_id in (select id from clinical_cases where couple_id like 'demo_mc%');
delete from clinical_cases where couple_id like 'demo_mc%';
delete from couples where id like 'demo_mc%';
delete from person_details where person_id like 'demo_m%';
delete from people where id like 'demo_m%';
