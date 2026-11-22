// Copy a field's text to the clipboard, falling back to selection copy on insecure origins such as LAN http.
export function copyField(field: HTMLTextAreaElement): boolean {
  if (navigator.clipboard && isSecureContext) {
    void navigator.clipboard.writeText(field.value);
    return true;
  }
  field.select();
  return document.execCommand("copy");
}
