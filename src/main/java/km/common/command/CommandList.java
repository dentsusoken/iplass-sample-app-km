/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import km.inquiry.command.InquiryCreateCommand;
import km.inquiry.command.InquiryDetailCommand;
import km.inquiry.command.InquiryListCommand;
import km.inquiry.command.InquiryStatusCommand;
import km.inquiry.command.InquiryTagUpdateCommand;
import km.inquiry.command.PostCreateCommand;
import km.inquiry.command.PostUpdateCommand;
import km.knowledge.command.KnowledgeCreateCommand;
import km.knowledge.command.KnowledgeDetailCommand;
import km.knowledge.command.KnowledgeManageListCommand;
import km.knowledge.command.KnowledgeSearchCommand;
import km.knowledge.command.KnowledgeUpdateCommand;
import km.tag.command.TagListCommand;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.MetaDataSeeAlso;

@MetaDataSeeAlso({
	AuthSessionCommand.class,
	InquiryListCommand.class,
	InquiryDetailCommand.class,
	InquiryCreateCommand.class,
	InquiryStatusCommand.class,
	InquiryTagUpdateCommand.class,
	PostCreateCommand.class,
	PostUpdateCommand.class,
	KnowledgeSearchCommand.class,
	KnowledgeDetailCommand.class,
	KnowledgeCreateCommand.class,
	KnowledgeUpdateCommand.class,
	KnowledgeManageListCommand.class,
	TagListCommand.class,
	SessionCheckCommand.class,
	ChangeLanguageCommand.class,
})
@CommandClass(name = "km/CommandList")
public class CommandList {}
