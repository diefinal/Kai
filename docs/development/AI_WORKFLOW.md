\# AI Development Workflow



Bu doküman Kai üzerinde çalışan bütün AI ajanlarının uyması gereken geliştirme sürecini tanımlar.



\---



\# Startup Order



AI aşağıdaki dosyaları sırayla okumalıdır.



1\. KAI.md

2\. AGENTS.md

3\. MASTER\_ARCHITECTURE.md

4\. ROADMAP.md

5\. TASKS.md

6\. DECISIONS.md

7\. MODULES.md

8\. CODING\_STANDARDS.md



\---



\# Development Rules



Her görev tek bir amacı yerine getirmelidir.



Her görev mümkün olduğunca az dosya değiştirmelidir.



Maksimum değiştirilecek dosya sayısı:



5



Eğer daha fazla dosya gerekiyorsa



STOP



Dependency Report oluştur.



Kullanıcı onayı bekle.



\---



\# Workflow



Read



↓



Analyze



↓



Implement



↓



Typecheck



↓



Build



↓



Tests



↓



Commit



↓



Push



↓



Stop



\---



\# Git Rules



Branch Format



feature/<feature-name>



Örnek



feature/vision-manager



feature/browser-engine



feature/planner



Commit Format



VISION-001 VisionManager completed



PLANNER-002 Task Scheduler



WINDOWS-004 Clipboard Service



\---



\# Validation



Her görev sonunda aşağıdaki komutlar çalıştırılmalıdır.



pnpm install



pnpm typecheck



pnpm build



pnpm test



Bu komutlardan biri başarısız olursa görev tamamlanmış sayılmaz.



\---



\# Reporting Format



AI sadece aşağıdaki bilgileri döndürmelidir.



Files Modified



Typecheck



Build



Tests



Commit Hash



Push Result



Remaining Errors



\---



\# Forbidden



Yasaktır:



\- Placeholder kod

\- TODO bırakmak

\- console.log kullanmak

\- any kullanmak

\- Açıklama yazıp kod yazmamak

\- Commit atmadan görevi tamamlandı olarak işaretlemek



\---



\# Success Definition



Bir görev aşağıdaki şartlar sağlandığında tamamlanmış kabul edilir.



\- Kod tamamlandı.

\- Typecheck geçti.

\- Build geçti.

\- Testler geçti.

\- Commit oluşturuldu.

\- GitHub'a push edildi.

