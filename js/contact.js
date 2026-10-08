/* 2232.inc — contact form: validates, posts to the Apps Script endpoint in the form's
   action (it mails hello@2232.co.jp), and swaps in a thank-you note.
   Endpoint source: work-agents/automation/2232-contact-form/Code.gs */
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector('.contact-form__status');
  const submit = form.querySelector('.contact-form__submit');
  const shownAt = Date.now();
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MESSAGES = {
    required: 'お名前・メールアドレス・お問い合わせ内容を入力してください。',
    email: 'メールアドレスの形式をご確認ください。',
    busy: '送信が混み合っています。時間をおいて再度お試しいただくか、hello@2232.co.jp まで直接ご連絡ください。',
    failed: '送信できませんでした。時間をおいて再度お試しいただくか、hello@2232.co.jp まで直接ご連絡ください。',
  };

  const say = (text) => {
    status.textContent = text || '';
  };

  const validate = () => {
    let error = '';
    form.querySelectorAll('[required]').forEach((field) => {
      const empty = !field.value.trim();
      const badEmail = field.type === 'email' && !empty && !EMAIL.test(field.value.trim());
      field.setAttribute('aria-invalid', String(empty || badEmail));
      if (!error && empty) error = 'required';
      if (!error && badEmail) error = 'email';
    });
    return error;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      say(MESSAGES[error]);
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    form.elements.elapsed.value = String(Date.now() - shownAt);
    submit.disabled = true;
    submit.textContent = 'Sending';
    say('送信しています…');

    try {
      const res = await fetch(form.action, { method: 'POST', body: new URLSearchParams(new FormData(form)) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'failed');
      form.innerHTML = `
        <p class="contact-form__done">Thank you. We&rsquo;ll be in touch.</p>
        <p class="contact-form__done-jp" lang="ja">送信しました。内容を確認のうえ、hello@2232.co.jp からご連絡します。</p>`;
      form.setAttribute('tabindex', '-1');
      form.focus();
    } catch (err) {
      say(MESSAGES[err.message] || MESSAGES.failed);
      submit.disabled = false;
      submit.textContent = 'Send';
    }
  });
})();
