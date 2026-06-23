/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.lifecycle.LifecycleHookService;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.inquiry.entity.Post;
import km.inquiry.enums.InquiryStatus;
import org.iplass.mtp.auth.Group;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.UploadFileHandle;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.BinaryReference;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.spi.ServiceRegistry;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 初回投稿付きで新しい問合せを作成する。
 *
 * <p>WebAPI: POST /api/km/inquiry/create</p>
 * <p>Accepts: multipart/form-data (name, content, attachments[])</p>
 *
 * <p>処理順: まず Post を登録し、その posts 参照を設定した Inquiry を登録する。</p>
 */
@WebApi(
		name = "km/inquiry/create",
		accepts = RequestType.REST_FORM,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/inquiry/InquiryCreateCommand")
public class InquiryCreateCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String name = request.getParam("name");
		String content = request.getParam("content");
		// バリデーション
		if (name == null || name.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "name is required"));
			return "ERROR";
		}

		if (content == null || content.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "content is required"));
			return "ERROR";
		}

		EntityManager em = EntityDaoHelper.getEntityManager();
		// 先に初回投稿の Post エンティティを作成する
		Entity post = new GenericEntity(Post.DEFINITION_NAME);
		post.setName(name.trim());
		post.setValue(Post.CONTENT, content.trim());
		// 添付ファイルの処理
		UploadFileHandle[] files = request.getParamsAsFile("attachments");

		if (files != null && files.length > 0) {
			BinaryReference[] attachments = Arrays.stream(files)
					.map(UploadFileHandle::toBinaryReference)
					.toArray(BinaryReference[]::new);
			post.setValue(Post.ATTACHMENTS, attachments);
		}

		// Post を登録 (createBy・createDate は iPLAss が自動設定)
		String postOid = em.insert(post);
		// posts 参照を持たせて Inquiry エンティティを作成する
		Entity inquiry = new GenericEntity(Inquiry.DEFINITION_NAME);
		inquiry.setName(name.trim());
		inquiry.setValue(Inquiry.STATUS, new SelectValue(InquiryStatus.Open.name()));
		// posts 参照を設定する (親子関係)
		Entity postRef = new GenericEntity(Post.DEFINITION_NAME);
		postRef.setOid(postOid);
		inquiry.setValue(Inquiry.POSTS, new Entity[] {postRef});
		// アクセス可能なグループコードを現在のユーザーの所属グループから設定する (作成時点のスナップショット)。
		// グループ未所属のときは null のままにする (空配列は iPLAss のバリデーションエラーになる)。
		User currentUser = AuthHelper.getCurrentUser();
		Group[] groups = currentUser.getGroups();
		String[] groupCodes = (groups != null)
				? Arrays.stream(groups)
						.map(Group::getCode)
						.filter(c -> c != null)
						.toArray(String[]::new)
				: null;
		if (groupCodes != null && groupCodes.length > 0) {
			inquiry.setValue(Inquiry.ACCESSIBLE_GROUP_CODES, groupCodes);
		}
		// Inquiry を登録 (createBy・createDate は iPLAss が自動設定)
		String inquiryOid = em.insert(inquiry);

		// 主処理は完了済み。拡張が登録されていれば副次処理を呼ぶ (未登録ならスキップ)。
		ServiceRegistry registry = ServiceRegistry.getRegistry();
		if (registry.exists(LifecycleHookService.class)) {
			LifecycleHookService hook = registry.getService(LifecycleHookService.class);
			hook.afterInquiryCreated(em, inquiryOid);
		}

		// レスポンス生成
		Map<String, Object> data = new HashMap<>();
		data.put("oid", inquiryOid);
		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(data));

		return "SUCCESS";
	}
}
