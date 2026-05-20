export function translateErrorReason(reason: string): string {
    if (!reason) return 'סיבה לא ידועה';

    const lowerReason = reason.toLowerCase();

    if (lowerReason.includes('eperm') || lowerReason.includes('eacces') || lowerReason.includes('access denied') 
        || lowerReason.includes('permission')) {
        return 'אין הרשאות גישה לקובץ זה. ייתכן שהקובץ חסום או שאין לך הרשאות קריאה.';
    }
    if (lowerReason.includes('ebusy') || lowerReason.includes('locked') || lowerReason.includes('in use')) {
        return 'הקובץ נמצא בשימוש על ידי תוכנה אחרת. אנא סגור את התוכנה שמשתמשת בקובץ ונסה שוב.';
    }
    if (lowerReason.includes('enoent') || lowerReason.includes('not found') || lowerReason.includes('no such file')) {
        return 'הקובץ לא נמצא. ייתכן שהוא נמחק, הועבר או ששמו שונה.';
    }
    if (lowerReason.includes('enospc') || lowerReason.includes('no space')) {
        return 'אין מספיק שטח פנוי בדיסק היעד.';
    }
    if (lowerReason.includes('enametoolong') || lowerReason.includes('path too long')) {
        return 'שם הקובץ או נתיב התיקייה ארוכים מדי עבור מערכת ההפעלה.';
    }
    if (lowerReason.includes('eio') || lowerReason.includes('io error')) {
        return 'שגיאת קריאה/כתיבה בכונן. ייתכן שיש בעיה פיזית בכונן או בחיבור שלו.';
    }
    if (lowerReason.includes('eexist') || lowerReason.includes('file already exists')) {
        return 'הקובץ כבר קיים ביעד.';
    }
    if (lowerReason.includes('network') || lowerReason.includes('disconnected')) {
        return 'שגיאת רשת או התנתקות כונן. אנא ודא שהכונן מחובר היטב.';
    }
    if (lowerReason.includes('eisdir') || lowerReason.includes('is a directory')) {
        return 'ניסיון להעתיק תיקייה כקובץ. ייתכן שנדרשת הגדרה להעתקה רקורסיבית (Recursive).';
    }
    if (lowerReason.includes('erofs') || lowerReason.includes('read-only')) {
        return 'מערכת הקבצים ביעד מוגדרת לקריאה בלבד. לא ניתן לכתוב לכונן זה.';
    }
    if (lowerReason.includes('efbig') || lowerReason.includes('file too large')) {
        return 'הקובץ גדול מדי עבור מערכת הקבצים של כונן היעד (לדוגמה, מגבלת קובץ בודד בפורמט FAT32).';
    }
    if (lowerReason.includes('emfile') || lowerReason.includes('enfile') || lowerReason.includes('too many open files')) {
        return 'עומס על מערכת ההפעלה (יותר מדי קבצים פתוחים בו-זמנית). אנא נסה שוב בעוד רגע.';
    }
    if (lowerReason.includes('etimedout') || lowerReason.includes('econnreset') || lowerReason.includes('timeout')) {
        return 'חיבור הרשת אל היעד פקע או נותק באופן פתאומי באמצע ההעברה.';
    }
    
    // Fallback
    return `אירעה שגיאה לא מוכרת (פרטים טכניים: ${reason})`;
}
