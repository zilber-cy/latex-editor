const _ = require('lodash')
const settings = require('@overleaf/settings')
const moment = require('moment')
const EmailMessageHelper = require('./EmailMessageHelper')
const StringHelper = require('../Helpers/StringHelper')
const BaseWithHeaderEmailLayout = require('./Layouts/BaseWithHeaderEmailLayout')
const SpamSafe = require('./SpamSafe')
const ctaEmailBody = require('./Bodies/cta-email')
const NoCTAEmailBody = require('./Bodies/NoCTAEmailBody')

function _emailBodyPlainText(content, opts, ctaEmail) {
  let emailBody = `${content.greeting(opts, true)}`
  emailBody += `\r\n\r\n`
  emailBody += `${content.message(opts, true).join('\r\n\r\n')}`

  if (ctaEmail) {
    emailBody += `\r\n\r\n`
    emailBody += `${content.ctaText(opts, true)}: ${content.ctaURL(opts, true)}`
  }

  if (
    content.secondaryMessage(opts, true) &&
    content.secondaryMessage(opts, true).length > 0
  ) {
    emailBody += `\r\n\r\n`
    emailBody += `${content.secondaryMessage(opts, true).join('\r\n\r\n')}`
  }

  emailBody += `\r\n\r\n`
  emailBody += `问候,\r\n${settings.appName} 团队 - ${settings.siteUrl}`

  if (
    settings.email &&
    settings.email.template &&
    settings.email.template.customFooter
  ) {
    emailBody += `\r\n\r\n`
    emailBody += settings.email.template.customFooter
  }

  return emailBody
}

function ctaTemplate(content) {
  if (
    !content.ctaURL ||
    !content.ctaText ||
    !content.message ||
    !content.subject
  ) {
    throw new Error('缺少必要的 CTA 邮件内容')
  }
  if (!content.title) {
    content.title = () => {}
  }
  if (!content.greeting) {
    content.greeting = () => '你好,'
  }
  if (!content.secondaryMessage) {
    content.secondaryMessage = () => []
  }
  if (!content.gmailGoToAction) {
    content.gmailGoToAction = () => {}
  }
  return {
    subject(opts) {
      return content.subject(opts)
    },
    layout: BaseWithHeaderEmailLayout,
    plainTextTemplate(opts) {
      return _emailBodyPlainText(content, opts, true)
    },
    compiledTemplate(opts) {
      return ctaEmailBody({
        title: content.title(opts),
        greeting: content.greeting(opts),
        message: content.message(opts),
        secondaryMessage: content.secondaryMessage(opts),
        ctaText: content.ctaText(opts),
        ctaURL: content.ctaURL(opts),
        gmailGoToAction: content.gmailGoToAction(opts),
        StringHelper,
      })
    },
  }
}

function NoCTAEmailTemplate(content) {
  if (content.greeting == null) {
    content.greeting = () => '你好,'
  }
  if (!content.message) {
    throw new Error('缺少消息')
  }
  return {
    subject(opts) {
      return content.subject(opts)
    },
    layout: BaseWithHeaderEmailLayout,
    plainTextTemplate(opts) {
      return `\
${content.greeting(opts)}

${content.message(opts, true).join('\r\n\r\n')}

问候,
${settings.appName} 团队 - ${settings.siteUrl}\
      `
    },
    compiledTemplate(opts) {
      return NoCTAEmailBody({
        title:
          typeof content.title === 'function' ? content.title(opts) : undefined,
        greeting: content.greeting(opts),
        message: content.message(opts),
        StringHelper,
      })
    },
  }
}

function buildEmail(templateName, opts) {
  const template = templates[templateName]
  opts.siteUrl = settings.siteUrl
  opts.body = template.compiledTemplate(opts)
  return {
    subject: template.subject(opts),
    html: template.layout(opts),
    text: template.plainTextTemplate && template.plainTextTemplate(opts),
  }
}

const templates = {}

templates.registered = ctaTemplate({
  subject() {
    return `激活你的 ${settings.appName} 账户`
  },
  message(opts) {
    return [
      `恭喜，你刚刚在 ${
        settings.appName
      } 上创建了一个账户，邮箱地址为 '${_.escape(opts.to)}'.`,
      '点击这里设置你的密码并登录:',
    ]
  },
  secondaryMessage() {
    return [
      `如果你有任何问题或者遇到问题，请联系 ${settings.adminEmail}`,
    ]
  },
  ctaText() {
    return '设置密码'
  },
  ctaURL(opts) {
    return opts.setNewPasswordUrl
  },
})

templates.canceledSubscription = ctaTemplate({
  subject() {
    return `${settings.appName} 想法`
  },
  message() {
    return [
      `我们很遗憾看到您取消了您的 ${settings.appName} 高级订阅。您是否愿意通过这个快速调查向我们提供一些反馈，让我们知道目前网站缺少什么？`,
    ]
  },
  secondaryMessage() {
    return ['提前感谢您！']
  },
  ctaText() {
    return '留下反馈'
  },
  ctaURL(opts) {
    return 'https://docs.google.com/forms/d/e/1FAIpQLSfa7z_s-cucRRXm70N4jEcSbFsZeb0yuKThHGQL8ySEaQzF0Q/viewform?usp=sf_link'
  },
})

templates.reactivatedSubscription = ctaTemplate({
  subject() {
    return `订阅已重新激活 - ${settings.appName}`
  },
  message(opts) {
    return ['您的订阅已成功重新激活。']
  },
  ctaText() {
    return '查看订阅仪表板'
  },
  ctaURL(opts) {
    return `${settings.siteUrl}/user/subscription`
  },
})

templates.passwordResetRequested = ctaTemplate({
  subject() {
    return `密码重置 - ${settings.appName}`
  },
  title() {
    return '密码重置'
  },
  message() {
    return [`我们收到了重置您的 ${settings.appName} 密码的请求。`]
  },
  secondaryMessage() {
    return [
      "如果您忽略此消息，您的密码将不会被更改。",
      "如果您没有请求重置密码，请告诉我们。",
    ]
  },
  ctaText() {
    return '重置密码'
  },
  ctaURL(opts) {
    return opts.setNewPasswordUrl
  },
})

templates.confirmEmail = ctaTemplate({
  subject() {
    return `确认电子邮件 - ${settings.appName}`
  },
  title() {
    return '确认电子邮件'
  },
  message(opts) {
    return [
      `请确认您已将新的电子邮件，${opts.to}，添加到您的 ${settings.appName} 账户。`,
    ]
  },
  secondaryMessage() {
    return [
      '如果您没有请求此操作，请通过 <a href="mailto:support@overleaf.com">support@overleaf.com</a> 告诉我们。',
      `如果您有任何问题或在确认您的电子邮件地址时遇到任何问题，请联系我们的支持团队 ${settings.adminEmail}。`,
    ]
  },
  ctaText() {
    return '确认电子邮件'
  },
  ctaURL(opts) {
    return opts.confirmEmailUrl
  },
})

templates.projectInvite = ctaTemplate({
  subject(opts) {
    const safeName = SpamSafe.isSafeProjectName(opts.project.name)
    const safeEmail = SpamSafe.isSafeEmail(opts.owner.email)

    if (safeName && safeEmail) {
      return `"${_.escape(opts.project.name)}" — 由 ${_.escape(
        opts.owner.email
      )} 分享`
    }
    if (safeName) {
      return `${settings.appName} 项目与您共享 — "${_.escape(
        opts.project.name
      )}"`
    }
    if (safeEmail) {
      return `${_.escape(opts.owner.email)} 与您共享了一个 ${
        settings.appName
      } 项目`
    }

    return `一个 ${settings.appName} 项目已与您共享`
  },
  title(opts) {
    return '项目邀请'
  },
  greeting(opts) {
    return ''
  },
  message(opts, isPlainText) {
    // build message depending on spam-safe variables
    const message = [`您被邀请参与一个 ${settings.appName} 项目。`]

    if (SpamSafe.isSafeProjectName(opts.project.name)) {
      message.push('<br/> 项目:')
      message.push(`<b>${_.escape(opts.project.name)}</b>`)
    }

    if (SpamSafe.isSafeEmail(opts.owner.email)) {
      message.push(`<br/> 分享者:`)
      message.push(`<b>${_.escape(opts.owner.email)}</b>`)
    }

    if (message.length === 1) {
      message.push('<br/> 请查看项目以获取更多信息。')
    }

    return message.map(m => {
      return EmailMessageHelper.cleanHTML(m, isPlainText)
    })
  },
  ctaText() {
    return '查看项目'
  },
  ctaURL(opts) {
    return opts.inviteUrl
  },
  gmailGoToAction(opts) {
    return {
      target: opts.inviteUrl,
      name: '查看项目',
      description: `在 ${settings.appName} 加入 ${_.escape(
        SpamSafe.safeProjectName(opts.project.name, '项目')
      )}`,
    }
  },
})

templates.reconfirmEmail = ctaTemplate({
  subject() {
    return `重新确认电子邮件 - ${settings.appName}`
  },
  title() {
    return '重新确认电子邮件'
  },
  message(opts) {
    return [
      `请重新确认您的电子邮件地址，${opts.to}，在您的 ${settings.appName} 账户上。`,
    ]
  },
  secondaryMessage() {
    return [
      '如果您没有请求此操作，您可以简单地忽略此消息。',
      `如果您有任何问题或在确认您的电子邮件地址时遇到任何问题，请联系我们的支持团队 ${settings.adminEmail}。`,
    ]
  },
  ctaText() {
    return '重新确认电子邮件'
  },
  ctaURL(opts) {
    return opts.confirmEmailUrl
  },
})

templates.verifyEmailToJoinTeam = ctaTemplate({
  subject(opts) {
    return `${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一个合作者')
    )} 邀请您加入 ${settings.appName} 的团队订阅`
  },
  title(opts) {
    return `${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一个合作者')
    )} 邀请您加入 ${settings.appName} 的团队订阅`
  },
  message(opts) {
    return [
      `请点击下面的按钮加入团队订阅，享受升级后的 ${settings.appName} 账户的好处。`,
    ]
  },
  ctaText(opts) {
    return '现在加入'
  },
  ctaURL(opts) {
    return opts.acceptInviteUrl
  },
})

templates.verifyEmailToJoinManagedUsers = ctaTemplate({
  subject(opts) {
    return `${
      opts.reminder ? '提醒：' : ''
    }您已被 ${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一个合作者')
    )} 邀请加入 ${settings.appName} 的团队订阅。`
  },
  title(opts) {
    return `${
      opts.reminder ? '提醒：' : ''
    }您已被 ${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一个合作者')
    )} 邀请加入 ${settings.appName} 的团队订阅。`
  },
  message(opts) {
    return [
      `通过加入此团队，您将可以使用 ${settings.appName} 的高级功能，如增加合作者、增加最大编译时间和实时跟踪更改等。`,
    ]
  },
  secondaryMessage(opts, isPlainText) {
    const changeProjectOwnerLink = EmailMessageHelper.displayLink(
      '更改项目所有者',
      `${settings.siteUrl}/learn/how-to/How_to_Transfer_Project_Ownership`,
      isPlainText
    )

    return [
      `<b>此团队的用户账户由 ${_.escape(
        _formatUserNameAndEmail(opts.admin, '管理员')
      )} 管理</b>`,
      `如果您接受，您将把您的 ${settings.appName} 账户的管理权转让给团队订阅的所有者，他们将拥有对您账户的管理员权限和对您内容的控制权。`,
      `如果您的 ${settings.appName} 账户中有您希望保持独立的个人项目，那么没有问题。您可以在个人电子邮件地址下设置另一个账户，并将您个人项目的所有权更改为新账户。了解如何 ${changeProjectOwnerLink}。`,
    ]
  },
  ctaURL(opts) {
    return opts.acceptInviteUrl
  },
  ctaText(opts) {
    return '接受邀请'
  },
  greeting() {
    return ''
  },
})

templates.inviteNewUserToJoinManagedUsers = ctaTemplate({
  subject(opts) {
    return `${
      opts.reminder ? '提醒：' : ''
    }您已被${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一位合作者')
    )}邀请加入一个${settings.appName}团队订阅。`
  },
  title(opts) {
    return `${
      opts.reminder ? '提醒：' : ''
    }您已被${_.escape(
      _formatUserNameAndEmail(opts.inviter, '一位合作者')
    )}邀请加入一个${settings.appName}团队订阅。`
  },
  message(opts) {
    return ['']
  },
  secondaryMessage(opts) {
    return [
      `该团队的用户账户由${_.escape(
        _formatUserNameAndEmail(opts.admin, '一位管理员')
      )}管理。`,
      `如果您接受，团队订阅的所有者将对您的账户拥有管理员权限，并能控制您的内容。`,
      `<b>${settings.appName}是什么？</b>`,
      `${settings.appName}是深受研究人员和技术写作人员喜爱的协作在线LaTeX编辑器。有数千个现成的模板和一系列LaTeX学习资源，您将立即上手。`,
    ]
  },
  ctaURL(opts) {
    return opts.acceptInviteUrl
  },
  ctaText(opts) {
    return '接受邀请'
  },
  greeting() {
    return ''
  },
})

templates.surrenderAccountForManagedUsers = ctaTemplate({
  subject(opts) {
    const admin = _.escape(_formatUserNameAndEmail(opts.admin, '一位管理员'))

    const toGroupName = opts.groupName ? ` 至 ${opts.groupName}` : ''

    return `${
      opts.reminder ? '提醒：' : ''
    }您已被${admin}邀请将您的${
      settings.appName
    }账户管理权${toGroupName}转移`
  },
  title(opts) {
    const admin = _.escape(_formatUserNameAndEmail(opts.admin, '一位管理员'))

    const toGroupName = opts.groupName ? ` 至 ${opts.groupName}` : ''

    return `${
      opts.reminder ? '提醒：' : ''
    }您已被${admin}邀请将您的${
      settings.appName
    }账户管理权${toGroupName}转移`
  },
  message(opts, isPlainText) {
    const admin = _.escape(_formatUserNameAndEmail(opts.admin, '一位管理员'))

    const managedUsersLink = EmailMessageHelper.displayLink(
      '用户账户管理',
      `${settings.siteUrl}/learn/how-to/Understanding_Managed_Overleaf_Accounts`,
      isPlainText
    )

    return [
      `您的${settings.appName}账户${_.escape(
        opts.to
      )}是${admin}的团队的一部分。他们现在已为该团队启用了${managedUsersLink}。这将确保当有人离开团队时，项目不会丢失。`,
    ]
  },
  secondaryMessage(opts, isPlainText) {
    const transferProjectOwnershipLink = EmailMessageHelper.displayLink(
      '更改项目所有者',
      `${settings.siteUrl}/learn/how-to/How_to_Transfer_Project_Ownership`,
      isPlainText
    )

    return [
      `<b>这对您意味着什么？</b>`,
      `如果您接受，您将把您的${settings.appName}账户的管理权转移给团队订阅的所有者，他们将对您的账户拥有管理员权限，并能控制您的内容。`,
      `如果您在${settings.appName}账户中有您想要保持独立的个人项目，那没问题。您可以在个人电子邮件地址下设置另一个账户，并将您的个人项目的所有权更改为新账户。了解如何${transferProjectOwnershipLink}。`,
      `如果您认为此邀请是错误发送的，请联系您的团队管理员。`,
    ]
  },
  ctaURL(opts) {
    return opts.acceptInviteUrl
  },
  ctaText(opts) {
    return '接受邀请'
  },
  greeting() {
    return ''
  },
})

templates.testEmail = ctaTemplate({
  subject() {
    return `${settings.appName}的测试邮件`
  },
  title() {
    return `${settings.appName}的测试邮件`
  },
  greeting() {
    return '你好，'
  },
  message() {
    return [`这是来自${settings.appName}的测试邮件`]
  },
  ctaText() {
    return `打开${settings.appName}`
  },
  ctaURL() {
    return settings.siteUrl
  },
})

templates.ownershipTransferConfirmationPreviousOwner = NoCTAEmailTemplate({
  subject(opts) {
    return `项目所有权转移 - ${settings.appName}`
  },
  title(opts) {
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, '您的项目')
    )
    return `${projectName} - 所有者更改`
  },
  message(opts, isPlainText) {
    const nameAndEmail = _.escape(
      _formatUserNameAndEmail(opts.newOwner, '一位合作者')
    )
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, '您的项目')
    )
    const projectNameDisplay = isPlainText
      ? projectName
      : `<b>${projectName}</b>`
    return [
      `根据您的请求，我们已将${nameAndEmail}设为${projectNameDisplay}的所有者。`,
      `如果您没有要求更改${projectNameDisplay}的所有者，请通过${settings.adminEmail}与我们联系。`,
    ]
  },
})

templates.ownershipTransferConfirmationNewOwner = ctaTemplate({
  subject(opts) {
    return `项目所有权转移 - ${settings.appName}`
  },
  title(opts) {
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, '您的项目')
    )
    return `${projectName} - 所有者更改`
  },
  message(opts, isPlainText) {
    const nameAndEmail = _.escape(
      _formatUserNameAndEmail(opts.previousOwner, '一位合作者')
    )
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, '一个项目')
    )
    const projectNameEmphasized = isPlainText
      ? projectName
      : `<b>${projectName}</b>`
    return [
      `${nameAndEmail}已将您设为${projectNameEmphasized}的所有者。您现在可以管理${projectName}的共享设置。`,
    ]
  },
  ctaText(opts) {
    return '查看项目'
  },
  ctaURL(opts) {
    const projectUrl = `${
      settings.siteUrl
    }/project/${opts.project._id.toString()}`
    return projectUrl
  },
})

templates.userOnboardingEmail = NoCTAEmailTemplate({
  subject(opts) {
    return `更多地利用${settings.appName}`
  },
  greeting(opts) {
    return ''
  },
  title(opts) {
    return `更多地利用${settings.appName}`
  },
  message(opts, isPlainText) {
    const learnLatexLink = EmailMessageHelper.displayLink(
      '30分钟学习LaTeX',
      `${settings.siteUrl}/learn/latex/Learn_LaTeX_in_30_minutes?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const templatesLinks = EmailMessageHelper.displayLink(
      '找到一个美丽的模板',
      `${settings.siteUrl}/latex/templates?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const collaboratorsLink = EmailMessageHelper.displayLink(
      '与您的合作者一起工作',
      `${settings.siteUrl}/learn/how-to/Sharing_a_project?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const siteLink = EmailMessageHelper.displayLink(
      'www.overleaf.com',
      settings.siteUrl,
      isPlainText
    )
    const userSettingsLink = EmailMessageHelper.displayLink(
      '这里',
      `${settings.siteUrl}/user/email-preferences`,
      isPlainText
    )
    const onboardingSurveyLink = EmailMessageHelper.displayLink(
      '加入我们的用户反馈计划',
      'https://forms.gle/DB7pdk2B1VFQqVVB9',
      isPlainText
    )
    return [
      `感谢您最近注册${settings.appName}。我们希望您发现它很有用！以下是一些关键功能，帮助您充分利用该服务：`,
      `${learnLatexLink}：在这个教程中，我们提供了一个快速且简单的LaTeX初级介绍，无需任何先验知识。当您完成时，您将编写您的第一个LaTeX文档！`,
      `${templatesLinks}：如果您正在寻找一个模板或示例来开始，我们在模板库中有大量选择，包括CV，项目报告，期刊文章等等。`,
      `${collaboratorsLink}：Overleaf的一个关键功能是能够分享项目并与其他用户协作。在这个快速的操作指南中，了解如何与您的同事分享您的项目。`,
      `${onboardingSurveyLink}，帮助我们使Overleaf变得更好！`,
      '再次感谢您使用Overleaf :)',
      `Lee`,
      `Lee Shalit<br />CEO<br />${siteLink}<hr>`,
      `您收到此电子邮件是因为您最近注册了一个Overleaf账户。如果您之前已订阅有关产品优惠和公司新闻和活动的电子邮件，您可以在${userSettingsLink}取消订阅。`,
    ]
  },
})

templates.securityAlert = NoCTAEmailTemplate({
  subject(opts) {
    return `Overleaf安全提示：${opts.action}`
  },
  title(opts) {
    return opts.action.charAt(0).toUpperCase() + opts.action.slice(1)
  },
  message(opts, isPlainText) {
    const dateFormatted = moment().format('dddd D MMMM YYYY')
    const timeFormatted = moment().format('HH:mm')
    const helpLink = EmailMessageHelper.displayLink(
      '快速指南',
      `${settings.siteUrl}/learn/how-to/Keeping_your_account_secure`,
      isPlainText
    )

    const actionDescribed = EmailMessageHelper.cleanHTML(
      opts.actionDescribed,
      isPlainText
    )

    if (!opts.message) {
      opts.message = []
    }
    const message = opts.message.map(m => {
      return EmailMessageHelper.cleanHTML(m, isPlainText)
    })

    return [
      `我们正在写信通知您，${actionDescribed}在${dateFormatted}的${timeFormatted} GMT。`,
      ...message,
      `如果这是您，您可以忽略此电子邮件。`,
      `如果这不是您，我们建议您通过${settings.adminEmail}与我们的支持团队联系，报告您的账户可能存在的可疑活动。`,
      `我们还鼓励您阅读我们的${helpLink}，以保护您的${settings.appName}账户安全。`,
    ]
  },
})

templates.SAMLDataCleared = ctaTemplate({
  subject(opts) {
    return `机构登录不再链接 - ${settings.appName}`
  },
  title(opts) {
    return '机构登录不再链接'
  },
  message(opts, isPlainText) {
    return [
      `我们正在写信通知您，由于我们这边的一个错误，我们不得不暂时禁用通过您的机构登录到您的${settings.appName}。`,
      `要再次启用，您需要通过您的设置重新链接您的机构电子邮件地址到您的${settings.appName}账户。`,
    ]
  },
  secondaryMessage() {
    return [
      `如果您通常通过您的机构登录到您的${settings.appName}账户，您可能需要首先设置或重置您的密码以重新获得您的账户访问权限。`,
      '这个错误并未影响任何账户的安全，但可能已影响了少数用户的许可权。我们对可能给您带来的任何不便表示歉意。',
      `如果您有任何问题，请通过${settings.adminEmail}或回复此电子邮件与我们的支持团队联系。`,
    ]
  },
  ctaText(opts) {
    return '更新我的电子邮件和隶属关系'
  },
  ctaURL(opts) {
    return `${settings.siteUrl}/user/settings`
  },
})

function _formatUserNameAndEmail(user, placeholder) {
  if (user.first_name && user.last_name) {
    const fullName = `${user.first_name} ${user.last_name}`
    if (SpamSafe.isSafeUserName(fullName)) {
      if (SpamSafe.isSafeEmail(user.email)) {
        return `${fullName} (${user.email})`
      } else {
        return fullName
      }
    }
  }
  return SpamSafe.safeEmail(user.email, placeholder)
}

module.exports = {
  templates,
  ctaTemplate,
  NoCTAEmailTemplate,
  buildEmail,
}
