export interface Messages {
  nav: {
    findWork:   string
    findTalent: string
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
  }
  jobs: {
    title:       string
    post:        string
    search:      string
    budget:      string
    deadline:    string
    experience:  string
    submitOffer: string
    noJobs:      string
    offers:      string
  }
  offers: {
    myOffers:      string
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
    myServices:   string
    createService: string
    browseServices: string
    startingAt:   string
    placeOrder:   string
    requirements: string
    packages: {
      basic:    string
      standard: string
      premium:  string
    }
  }
  common: {
    loading: string
    error:   string
    save:    string
    cancel:  string
    edit:    string
    delete:  string
    back:    string
    dzd:     string
    days:    string
  }
}
