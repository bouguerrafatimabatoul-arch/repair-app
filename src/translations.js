const translations = {
  en: {
    dir: 'ltr',
    appTitle: 'RESITECH',
    appSubtitle: 'Maintenance Request System',
    bacMatricule: 'Bac Registration Number',
    bacMatriculePlaceholder: 'e.g. 123456789',
    bacYear: 'Bac Year',
    bacYearPlaceholder: 'e.g. 2022',
    login: 'Login',
    loginError: 'Incorrect registration number or bac year.',
    welcome: 'Welcome',
    room: 'Room',
    pavilion: 'Pavilion',
    residence: 'Residence',
    logout: 'Logout',

    location: 'Problem Location',
    locationPlaceholder: 'Select a location',
    locations: { room: 'Room', pavilion: 'Pavilion', toilets: 'Toilets' },

    // Exact location fields per location type
    exactLocation: {
      room: null, // auto-filled from student profile
      pavilion: 'Specify exact spot in pavilion',
      toilets: 'Specify exact toilet location',
    },
    exactLocationPlaceholder: {
      pavilion: 'e.g. Ground floor corridor, Building B entrance...',
      toilets: 'e.g. 2nd floor east wing, near room 210...',
    },

    problemType: 'Problem Type',
    problemTypePlaceholder: 'Select problem type',
    problemTypes: {
      room: ['Electricity', 'Heating', 'Furniture', 'Door / Window', 'Other'],
      pavilion: ['Lighting', 'Doors', 'Security', 'Cleanliness', 'Other'],
      toilets: ['Plumbing', 'Cleanliness', 'Water Leakage', 'Other'],
    },

    priority: 'Priority',
    priorities: { High: 'High', Medium: 'Medium', Low: 'Low' },
    priorityAuto: 'Auto-assigned',
    priorityHighNote: 'High priority — night shift available if needed',

    description: 'Description',
    descriptionPlaceholder: 'Describe the problem clearly...',

    image: 'Photo (optional)',
    imageBtn: 'Upload a photo',
    imageSelected: 'Photo selected',

    availability: 'Preferred time for repair visit',
    availabilityNote: 'Select an available time slot (8am–5pm)',
    nightShift: 'Night Shift (Emergency only)',

    fillAll: 'Please fill in all required fields.',
    fillExactLocation: 'Please specify the exact location.',
    submit: 'Submit Request',

    successTitle: 'Request Submitted!',
    successMsg: 'Your request has been submitted successfully.',
    trackingCode: 'Your tracking code',
    screenshotNote: 'Screenshot this code to track your request later',
    trackAnother: 'Submit Another Request',

    trackTitle: 'Track Your Request',
    trackPlaceholder: 'Enter tracking code (e.g. RQ-ABC123)',
    trackBtn: 'Search',
    trackNotFound: 'No request found with this code.',
    statusLabel: 'Status',
    dateLabel: 'Submitted on',
    locationLabel: 'Location',
    exactLocationLabel: 'Exact spot',
    typeLabel: 'Problem Type',
    priorityLabel: 'Priority',
    descLabel: 'Description',
    availabilityLabel: 'Scheduled time',

    feedbackPrompt: 'How was the repair service?',
    feedbackNote: 'Additional comments (optional)',
    feedbackNotePlaceholder: 'Leave your comments here...',
    feedbackSubmit: 'Submit Feedback',
    feedbackThanks: 'Thank you for your feedback!',

    myTickets: 'My Requests',
    newRequest: 'New Request',
    trackNav: 'Track',
    noTickets: 'You have no requests yet.',

    statuses: {
      'En attente': 'Pending',
      'En cours': 'In Progress',
      'Résolu': 'Completed',
    },
  },

  fr: {
    dir: 'ltr',
    appTitle: 'RESITECH',
    appSubtitle: 'Système de demandes de réparation',
    bacMatricule: 'Matricule de Bac',
    bacMatriculePlaceholder: 'Ex: 123456789',
    bacYear: 'Année de Bac',
    bacYearPlaceholder: 'Ex: 2022',
    login: 'Se connecter',
    loginError: 'Matricule ou année de bac incorrect.',
    welcome: 'Bienvenue',
    room: 'Chambre',
    pavilion: 'Pavillon',
    residence: 'Résidence',
    logout: 'Déconnexion',

    location: 'Emplacement du problème',
    locationPlaceholder: 'Sélectionner un emplacement',
    locations: { room: 'Chambre', pavilion: 'Pavillon', toilets: 'Toilettes' },

    exactLocation: {
      room: null,
      pavilion: 'Précisez l\'endroit exact dans le pavillon',
      toilets: 'Précisez l\'endroit exact des toilettes',
    },
    exactLocationPlaceholder: {
      pavilion: 'Ex: Couloir rez-de-chaussée, entrée bâtiment B...',
      toilets: 'Ex: 2ème étage aile est, près de la chambre 210...',
    },

    problemType: 'Type de problème',
    problemTypePlaceholder: 'Sélectionner le type',
    problemTypes: {
      room: ['Électricité', 'Chauffage', 'Mobilier', 'Porte / Fenêtre', 'Autre'],
      pavilion: ['Éclairage', 'Portes', 'Sécurité', 'Propreté', 'Autre'],
      toilets: ['Plomberie', 'Propreté', "Fuite d'eau", 'Autre'],
    },

    priority: 'Priorité',
    priorities: { High: 'Haute', Medium: 'Moyenne', Low: 'Faible' },
    priorityAuto: 'Assignée automatiquement',
    priorityHighNote: 'Haute priorité — équipe de nuit disponible si nécessaire',

    description: 'Description',
    descriptionPlaceholder: 'Décrivez le problème clairement...',

    image: 'Photo (optionnel)',
    imageBtn: 'Télécharger une photo',
    imageSelected: 'Photo sélectionnée',

    availability: 'Heure souhaitée pour la visite',
    availabilityNote: 'Sélectionnez un créneau (8h–17h)',
    nightShift: 'Équipe de nuit (Urgence uniquement)',

    fillAll: 'Veuillez remplir tous les champs obligatoires.',
    fillExactLocation: "Veuillez préciser l'emplacement exact.",
    submit: 'Envoyer la demande',

    successTitle: 'Demande envoyée !',
    successMsg: 'Votre demande a été soumise avec succès.',
    trackingCode: 'Votre code de suivi',
    screenshotNote: 'Prenez une capture pour suivre votre demande plus tard',
    trackAnother: 'Soumettre une autre demande',

    trackTitle: 'Suivre votre demande',
    trackPlaceholder: 'Entrez le code de suivi (ex: RQ-ABC123)',
    trackBtn: 'Rechercher',
    trackNotFound: 'Aucune demande trouvée avec ce code.',
    statusLabel: 'Statut',
    dateLabel: 'Soumis le',
    locationLabel: 'Emplacement',
    exactLocationLabel: 'Endroit précis',
    typeLabel: 'Type de problème',
    priorityLabel: 'Priorité',
    descLabel: 'Description',
    availabilityLabel: 'Créneau prévu',

    feedbackPrompt: "Comment s'est passée la réparation ?",
    feedbackNote: 'Commentaires supplémentaires (optionnel)',
    feedbackNotePlaceholder: 'Laissez vos commentaires ici...',
    feedbackSubmit: "Soumettre l'évaluation",
    feedbackThanks: 'Merci pour votre évaluation !',

    myTickets: 'Mes demandes',
    newRequest: 'Nouvelle demande',
    trackNav: 'Suivi',
    noTickets: "Vous n'avez pas encore de demandes.",

    statuses: {
      'En attente': 'En attente',
      'En cours': 'En cours',
      'Résolu': 'Résolu',
    },
  },

  ar: {
    dir: 'rtl',
    appTitle: 'RESITECH',
    appSubtitle: 'نظام طلبات الصيانة',
    bacMatricule: 'رقم تسجيل الباكالوريا',
    bacMatriculePlaceholder: 'مثال: 123456789',
    bacYear: 'سنة الباكالوريا',
    bacYearPlaceholder: 'مثال: 2022',
    login: 'تسجيل الدخول',
    loginError: 'رقم التسجيل أو سنة الباك غير صحيح.',
    welcome: 'مرحباً',
    room: 'الغرفة',
    pavilion: 'الجناح',
    residence: 'الإقامة',
    logout: 'تسجيل الخروج',

    location: 'موقع المشكلة',
    locationPlaceholder: 'اختر الموقع',
    locations: { room: 'الغرفة', pavilion: 'الجناح', toilets: 'الحمامات' },

    exactLocation: {
      room: null,
      pavilion: 'حدد المكان الدقيق في الجناح',
      toilets: 'حدد المكان الدقيق في الحمام',
    },
    exactLocationPlaceholder: {
      pavilion: 'مثال: ممر الطابق الأرضي، مدخل المبنى ب...',
      toilets: 'مثال: الطابق الثاني الجناح الشرقي، بالقرب من غرفة 210...',
    },

    problemType: 'نوع المشكلة',
    problemTypePlaceholder: 'اختر نوع المشكلة',
    problemTypes: {
      room: ['الكهرباء', 'التدفئة', 'الأثاث', 'باب / نافذة', 'أخرى'],
      pavilion: ['الإضاءة', 'الأبواب', 'الأمن', 'النظافة', 'أخرى'],
      toilets: ['السباكة', 'النظافة', 'تسرب المياه', 'أخرى'],
    },

    priority: 'الأولوية',
    priorities: { High: 'عالية', Medium: 'متوسطة', Low: 'منخفضة' },
    priorityAuto: 'تُحدد تلقائياً',
    priorityHighNote: 'أولوية عالية — الوردية الليلية متاحة عند الضرورة',

    description: 'الوصف',
    descriptionPlaceholder: 'اشرح المشكلة بوضوح...',

    image: 'صورة (اختياري)',
    imageBtn: 'رفع صورة',
    imageSelected: 'تم اختيار الصورة',

    availability: 'الوقت المفضل للزيارة',
    availabilityNote: 'اختر موعداً (8ص–5م)',
    nightShift: 'الوردية الليلية (للحالات الطارئة فقط)',

    fillAll: 'يرجى ملء جميع الحقول المطلوبة.',
    fillExactLocation: 'يرجى تحديد الموقع الدقيق.',
    submit: 'إرسال الطلب',

    successTitle: 'تم إرسال الطلب!',
    successMsg: 'تم تقديم طلبك بنجاح.',
    trackingCode: 'كود المتابعة الخاص بك',
    screenshotNote: 'احتفظ بهذا الكود لمتابعة طلبك لاحقاً',
    trackAnother: 'تقديم طلب آخر',

    trackTitle: 'تتبع طلبك',
    trackPlaceholder: 'أدخل كود المتابعة (مثال: RQ-ABC123)',
    trackBtn: 'بحث',
    trackNotFound: 'لم يتم العثور على طلب بهذا الكود.',
    statusLabel: 'الحالة',
    dateLabel: 'تاريخ التقديم',
    locationLabel: 'الموقع',
    exactLocationLabel: 'المكان الدقيق',
    typeLabel: 'نوع المشكلة',
    priorityLabel: 'الأولوية',
    descLabel: 'الوصف',
    availabilityLabel: 'الموعد المحدد',

    feedbackPrompt: 'كيف كانت خدمة الإصلاح؟',
    feedbackNote: 'ملاحظات إضافية (اختياري)',
    feedbackNotePlaceholder: 'اترك تعليقك هنا...',
    feedbackSubmit: 'إرسال التقييم',
    feedbackThanks: 'شكراً على تقييمك!',

    myTickets: 'طلباتي',
    newRequest: 'طلب جديد',
    trackNav: 'تتبع',
    noTickets: 'ليس لديك أي طلبات حتى الآن.',

    statuses: {
      'En attente': 'قيد الانتظار',
      'En cours': 'جارٍ المعالجة',
      'Résolu': 'تم الحل',
    },
  },
}

export default translations
