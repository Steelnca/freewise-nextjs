export interface Messages {
  nav: {
    findWork:   string
    findTalent: string
    services:   string
    collabs:    string
    login:      string
    register:   string
    dashboard:  string
    logout:     string
  }
  home: {
    badge:         string
    title:         string
    subtitle:      string
    ctaClient:     string
    ctaFreelancer: string
    stats: {
      freelancers: string
      jobs:        string
      secured:     string
    }
    howTitle: string
    client: {
      title: string
      steps: string[]
    }
    freelancer: {
      title: string
      steps: string[]
    }
    categoriesTitle: string
    readyTitle:      string
    readySubtitle:   string
  }
  auth: {
    login: {
      title:        string
      subtitle:     string
      username:     string
      password:     string
      submit:       string
      noAccount:    string
      registerLink: string
      forgotPasswordLink: string
    }
    register: {
      title:       string
      subtitle:    string
      username:    string
      email:       string
      password:    string
      password2:   string
      submit:      string
      haveAccount: string
      loginLink:   string
    }
  }
  dashboard: {
    welcome:            string
    switchToClient:     string
    switchToFreelancer: string
    activateClient:     string
    activateFreelancer: string
    noRole:             string
    chooseRole:         string
    overview:           string
    payments:           string
    myJobs:             string
    postJob:            string
    browseJobs:         string
    myProposals:        string
    myServices:         string
    contracts:          string
    profile:            string
    collabs:            string
    settings:           string
  }
  payments: {
    title:       string
    balance:    string
    transactions: string
    deposit:    string
    withdraw:   string
    noTransactions: string
  }
  jobs: {
    title:          string
    post:           string
    search:         string
    budget:         string
    deadline:       string
    experience:     string
    jobDetail:      string
    viewProposal:   string
    submitProposal: string
    noJobs:         string
    proposals:      string
    allCategories:  string
    anyLevel:       string
    entryLevel:     string
    midLevel:       string
    expertLevel:    string
  }
  proposals: {
    myProposals:   string
    coverLetter:   string
    proposedPrice: string
    deliveryDays:  string
    submit:        string
    withdraw:      string
    status: {
      pending:   string
      accepted:  string
      rejected:  string
      withdrawn: string
    }
  }
  services: {
    myServices:     string
    createService:  string
    browseServices: string
    startingAt:     string
    placeOrder:     string
    requirements:   string
    noServices:     string
    packages: {
      basic:    string
      standard: string
      premium:  string
    }
  }
  contracts: {
    title:         string
    noContracts:   string
    fundEscrow:    string
    submitWork:    string
    approve:       string
    dispute:       string
    leaveReview:   string
    status: {
      active:    string
      completed: string
      disputed:  string
      cancelled: string
    }
    milestone: {
      status: {
        pending:   string
        funded:    string
        submitted: string
        approved:  string
        released:  string
        disputed:  string
        refunded:  string
      }
    }
  }
  reviews: {
    title:       string
    leaveReview: string
    submit:      string
    comment:     string
    labels: {
      poor:      string
      fair:      string
      good:      string
      great:     string
      excellent: string
    }
  }
  collabs: {
    title:        string
    postCollab:   string
    apply:        string
    noCollabs:    string
    spotsNeeded:  string
    applicants:   string
    members:      string
    yourPost:     string
    sendApp:      string
    status: {
      open:   string
      closed: string
    }
  }
  freelancers: {
    title:          string
    subtitle:       string
    anyAvailability: string
    available:      string
    busy:           string
    skills:         string
    hourlyRate:     string
    noFreelancers:  string
    clearFilters:   string
    status: {
      available:   string
      busy:        string
      unavailable: string
    }
  }
  notifications: {
    title:       string
    markAllRead: string
    empty:       string
  }
  settings: {
    title:       string
    profile:     string
    language:    string
    roles:       string
    dangerZone:  string
    logoutAll:   string
    saveChanges: string
    activeRoles: string
  }
  common: {
    loading:      string
    error:        string
    save:         string
    cancel:       string
    edit:         string
    delete:       string
    back:         string
    dzd:          string
    days:         string
    search:       string
    clearFilters: string
    viewAll:      string
    noData:       string
    by:           string
    hours:        string
  }
}