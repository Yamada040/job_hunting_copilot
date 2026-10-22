-- 企業・ES・Webテストの問題へのひも付けを、持ち主が同じ行にしか張れないようにする（多層防御）。
-- バックエンドは company.EnsureOwned などで本人のものかを確かめているが、確かめ忘れがあっても DB が他人の行へのひも付けを弾く。
-- 外部キーを (id, user_id) の組で張るため、参照される側に unique (id, user_id) を足す（id は主キーなので値の重複は増えない）。
-- 外部キーの名前と on delete cascade はそのままにし、企業や退会で ES などが消える挙動は変えない。
-- 制約の置き換えだけなので、1つ前のバージョンのコードでも動く（そのコードも本人の行にしかひも付けない）。
-- not valid で足して後から validate する形にしないのは、このファイルは1つのトランザクションで当たり、強いロックは最後まで残るので得が無いため。
-- 既存の行に不整合があれば適用が失敗して丸ごと巻き戻り、release.yml はデプロイに進まない。

alter table public.companies add constraint companies_id_user_id_key unique (id, user_id);
alter table public.es_entries add constraint es_entries_id_user_id_key unique (id, user_id);
alter table public.webtest_questions add constraint webtest_questions_id_user_id_key unique (id, user_id);

-- company_id が null の行（企業にひも付けない予定）は、既定の MATCH SIMPLE なので検査されない
alter table public.es_entries
  drop constraint es_entries_company_id_fkey,
  add constraint es_entries_company_id_fkey foreign key (company_id, user_id)
    references public.companies (id, user_id) on delete cascade;

alter table public.interview_logs
  drop constraint interview_logs_company_id_fkey,
  add constraint interview_logs_company_id_fkey foreign key (company_id, user_id)
    references public.companies (id, user_id) on delete cascade;

alter table public.calendar_events
  drop constraint calendar_events_company_id_fkey,
  add constraint calendar_events_company_id_fkey foreign key (company_id, user_id)
    references public.companies (id, user_id) on delete cascade;

alter table public.es_reviews
  drop constraint es_reviews_es_entry_id_fkey,
  add constraint es_reviews_es_entry_id_fkey foreign key (es_entry_id, user_id)
    references public.es_entries (id, user_id) on delete cascade;

alter table public.webtest_attempts
  drop constraint webtest_attempts_question_id_fkey,
  add constraint webtest_attempts_question_id_fkey foreign key (question_id, user_id)
    references public.webtest_questions (id, user_id) on delete cascade;
