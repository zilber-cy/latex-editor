const config = {
  tableHead: {
    individual_free: {},
    individual_collaborator: {},
    individual_professional: {},
    student_student: {
      showExtraContent: true,
    },
  },
  highlightedColumn: {
    index: 1,
    text: {
      monthly: 'most_popular',
      annual: 'most_popular',
    },
  },
  eventTrackingKey: 'paywall-plans-page-click',
  showStudentsOnlyLabel: true,
  features: [
    {
      divider: false,
      items: [
        {
          feature: 'number_of_users',
          info: 'number_of_users_info',
          value: 'str',
          plans: {
            free: 'one_user',
            collaborator: 'one_user',
            professional: 'one_user',
            student: 'one_user',
          },
        },
        {
          feature: 'max_collab_per_project',
          info: 'max_collab_per_project_info',
          value: 'str',
          plans: {
            free: 'you_plus_1',
            collaborator: 'you_plus_10',
            professional: 'unlimited_bold',
            student: 'you_plus_6',
          },
        },
      ],
    },
    {
      divider: true,
      dividerLabel: 'you_and_collaborators_get_access_to',
      dividerInfo: 'you_and_collaborators_get_access_to_info',
      items: [
        {
          feature: 'compile_timeout_short',
          info: 'compile_timeout_short_info',
          value: 'str',
          plans: {
            free: 'one_minute',
            collaborator: 'four_minutes',
            professional: 'four_minutes',
            student: 'four_minutes',
          },
        },
        {
          feature: 'compile_servers',
          info: 'compile_servers_info',
          value: 'str',
          plans: {
            free: 'fast',
            collaborator: 'fastest',
            professional: 'fastest',
            student: 'fastest',
          },
        },
        {
          feature: 'realtime_track_changes',
          info: 'realtime_track_changes_info_v2',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'full_doc_history',
          info: 'full_doc_history_info_v2',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'reference_search',
          info: 'reference_search_info_v2',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'git_integration_lowercase',
          info: 'git_integration_lowercase_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
      ],
    },
    {
      divider: true,
      dividerLabel: 'you_get_access_to',
      dividerInfo: 'you_get_access_to_info',
      items: [
        {
          feature: 'powerful_latex_editor_and_realtime_collaboration',
          info: 'powerful_latex_editor_and_realtime_collaboration_info',
          value: 'bool',
          plans: {
            free: true,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'unlimited_projects',
          info: 'unlimited_projects_info',
          value: 'bool',
          plans: {
            free: true,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'thousands_templates',
          info: 'hundreds_templates_info',
          value: 'bool',
          plans: {
            free: true,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'symbol_palette',
          info: 'symbol_palette_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'github_only_integration_lowercase',
          info: 'github_only_integration_lowercase_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'dropbox_integration_lowercase',
          info: 'dropbox_integration_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'mendeley_integration_lowercase',
          info: 'mendeley_integration_lowercase_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'zotero_integration_lowercase',
          info: 'zotero_integration_lowercase_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
        {
          feature: 'priority_support',
          info: 'priority_support_info',
          value: 'bool',
          plans: {
            free: false,
            collaborator: true,
            professional: true,
            student: true,
          },
        },
      ],
    },
  ],
}

module.exports = config
